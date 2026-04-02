/**
 * GET /api/milestones – Fetch milestones with progress data and program roll-up
 * (100% from WorkItem Features + User Story tags — not from local `Milestone` rows.)
 * Query params: workstreamId (optional) – filter by workstream
 * Response: { milestones: ApiMilestoneWithProgress[], programRollup: ApiProgramMilestoneRollup }
 *
 * POST /api/milestones – Create milestone (manual row; not included in GET)
 * Body: { title, workstreamId, targetMonth, status?, adoFeatureId?, notes? }
 * Response: 201 with created milestone
 */

import { NextResponse } from 'next/server';
import {
  computeMilestoneProgress,
  computeProgramMilestoneRollup,
  deriveMilestoneStatus,
  type ChildStoryInput,
  type MilestoneProgressInput,
} from '@/lib/milestones/calculator';
import { extractMilestoneTagBadgeLabel, hasMilestoneRollupTag } from '@/lib/milestones/format';
import {
  adoFeatureMilestoneId,
  deriveTargetMonthAndQuarter,
  featureMatchesWorkstreamFilter,
  featureQualifiesForAdpMetrics,
} from '@/lib/milestones/tag-derived';
import type { MilestoneWorkstreamBreakdown } from '@/lib/milestones/types';
import { validateCreate } from '@/lib/milestones/validation';
import { prisma } from '@/lib/prisma';
import { mapStateToStatusGroup } from '@/lib/sprints/status-mapping';

/** Child stories with no resolvable workstream still roll up here so quarterly charts show the Feature. */
const UNASSIGNED_WORKSTREAM_ID = '__unassigned__';

const UNASSIGNED_WORKSTREAM = {
  id: UNASSIGNED_WORKSTREAM_ID,
  name: 'Area not mapped to workstream',
} as const;

type MilestoneRow = {
  id: string;
  title: string;
  workstreamId: string;
  targetMonth: Date;
  status: string;
  adoFeatureId: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  workstream: { id: string; name: string };
};

type ChildStoryRow = {
  parentAdoId: number | null;
  state: string;
  storyPoints: number | null;
  tags: string | null;
  workstreamId: string | null;
  workstream: { id: string; name: string } | null;
  sprint: {
    id: string;
    name: string;
    startDate: Date;
  } | null;
};

/** User Stories that explicitly carry ADP-{MON} and/or Q#-PLAN tags. */
function effectiveChildStoriesForFeature(stories: ChildStoryRow[]): ChildStoryRow[] {
  return stories.filter((s) => hasMilestoneRollupTag(s.tags ?? null));
}

function formatMilestone(m: MilestoneRow) {
  return {
    id: m.id,
    title: m.title,
    workstreamId: m.workstreamId,
    targetMonth: m.targetMonth.toISOString(),
    status: m.status,
    adoFeatureId: m.adoFeatureId,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    workstream: { id: m.workstream.id, name: m.workstream.name },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workstreamFilter = searchParams.get('workstreamId');
    const today = new Date();

    const [featureWorkItems, allChildStories] = await Promise.all([
      prisma.workItem.findMany({
        where: { type: 'Feature' },
        include: { workstream: true },
      }),
      prisma.workItem.findMany({
        where: {
          type: 'UserStory',
          parentAdoId: { not: null },
        },
        select: {
          parentAdoId: true,
          state: true,
          storyPoints: true,
          tags: true,
          workstreamId: true,
          workstream: { select: { id: true, name: true } },
          sprint: {
            select: { id: true, name: true, startDate: true },
          },
        },
      }),
    ]);

    const childrenByFeature = new Map<number, ChildStoryRow[]>();
    for (const story of allChildStories) {
      if (story.parentAdoId === null) {
        continue;
      }
      const pid = story.parentAdoId;
      const list = childrenByFeature.get(pid) ?? [];
      list.push(story);
      childrenByFeature.set(pid, list);
    }

    type QualifiedFeature = {
      adoId: number;
      title: string;
      tags: string | null;
      workstreamId: string | null;
      workstream: { id: string; name: string } | null;
      createdAt: Date;
      updatedAt: Date;
      targetMonth: Date;
      quarter: string | null;
    };

    const qualified: QualifiedFeature[] = [];

    for (const f of featureWorkItems) {
      const raw = childrenByFeature.get(f.adoId) ?? [];
      if (!featureQualifiesForAdpMetrics(f.tags, raw)) {
        continue;
      }
      const effectiveRows = effectiveChildStoriesForFeature(raw);
      if (!featureMatchesWorkstreamFilter(f.workstreamId, effectiveRows, workstreamFilter)) {
        continue;
      }
      const { targetMonth, quarter } = deriveTargetMonthAndQuarter(
        f.tags ?? null,
        effectiveRows,
        today
      );
      qualified.push({
        adoId: f.adoId,
        title: f.title,
        tags: f.tags ?? null,
        workstreamId: f.workstreamId,
        workstream: f.workstream,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        targetMonth,
        quarter,
      });
    }

    qualified.sort((a, b) => a.targetMonth.getTime() - b.targetMonth.getTime());

    const storiesByFeature = new Map<number, ChildStoryInput[]>();
    for (const q of qualified) {
      const raw = childrenByFeature.get(q.adoId) ?? [];
      const effective = effectiveChildStoriesForFeature(raw);
      storiesByFeature.set(
        q.adoId,
        effective.map((story) => ({
          state: story.state,
          storyPoints: story.storyPoints,
          sprint: story.sprint
            ? { id: story.sprint.id, name: story.sprint.name, startDate: story.sprint.startDate }
            : null,
        }))
      );
    }

    const buildWorkstreamBreakdown = (featureAdoId: number): MilestoneWorkstreamBreakdown[] => {
      const raw = childrenByFeature.get(featureAdoId) ?? [];
      const effective = effectiveChildStoriesForFeature(raw);

      const byWorkstream = new Map<string, { name: string; stories: ChildStoryRow[] }>();

      for (const story of effective) {
        if (story.parentAdoId !== featureAdoId) {
          continue;
        }
        const wsKey = story.workstreamId ?? UNASSIGNED_WORKSTREAM_ID;
        const entry = byWorkstream.get(wsKey) ?? {
          name:
            story.workstreamId != null
              ? (story.workstream?.name ?? 'Unknown')
              : 'Area not mapped to workstream',
          stories: [],
        };
        entry.stories.push(story);
        byWorkstream.set(wsKey, entry);
      }

      return Array.from(byWorkstream.entries()).map(([wsId, { name, stories: wsStories }]) => {
        const total = wsStories.length;
        const inProgress = wsStories.filter(
          (s) => mapStateToStatusGroup(s.state) === 'Active'
        ).length;
        const completed = wsStories.filter((s) => {
          const group = mapStateToStatusGroup(s.state);
          return group === 'Resolved' || group === 'Completed';
        }).length;

        return {
          workstreamId: wsId,
          workstreamName: name,
          totalStories: total,
          inProgressCount: inProgress,
          inProgressPercent: total > 0 ? Math.round((inProgress / total) * 100) : 0,
          completedCount: completed,
          completedPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    };

    const milestonesWithProgress = qualified.map((q) => {
      const wsResolved =
        q.workstreamId != null && q.workstream
          ? { id: q.workstream.id, name: q.workstream.name }
          : UNASSIGNED_WORKSTREAM;
      const resolvedWorkstreamId = q.workstreamId ?? UNASSIGNED_WORKSTREAM_ID;

      const base = {
        id: adoFeatureMilestoneId(q.adoId),
        title: q.title,
        workstreamId: resolvedWorkstreamId,
        targetMonth: q.targetMonth.toISOString(),
        adoFeatureId: q.adoId,
        notes: null as string | null,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
        workstream: wsResolved,
      };

      const children = storiesByFeature.get(q.adoId) ?? [];
      const progress = computeMilestoneProgress(q.adoId, children);
      const rawStories = childrenByFeature.get(q.adoId) ?? [];
      const effectiveRows = effectiveChildStoriesForFeature(rawStories);
      const quarter = q.quarter;

      return {
        ...base,
        status: deriveMilestoneStatus(progress.percentComplete),
        completedPoints: progress.completedSP,
        totalPoints: progress.totalSP,
        percentComplete: progress.percentComplete,
        quarter,
        burnupData: progress.burnupData,
        workstreamBreakdown: buildWorkstreamBreakdown(q.adoId),
        featureTags: q.tags,
        adpMonTagLabel: extractMilestoneTagBadgeLabel(q.tags, effectiveRows),
      };
    });

    const rollupInputs: MilestoneProgressInput[] = qualified.map((q, i) => {
      const mp = milestonesWithProgress[i];
      return {
        targetMonth: q.targetMonth,
        quarter: mp.quarter,
        progress: {
          adoFeatureId: q.adoId,
          totalSP: mp.totalPoints,
          completedSP: mp.completedPoints,
          percentComplete: mp.percentComplete,
          burnupData: mp.burnupData,
        },
      };
    });

    const programRollup = computeProgramMilestoneRollup(rollupInputs);

    return NextResponse.json({ milestones: milestonesWithProgress, programRollup });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', errors: ['Request body must be valid JSON'] },
        { status: 400 }
      );
    }

    const result = validateCreate(body as Record<string, unknown>);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Validation failed', errors: result.errors },
        { status: 400 }
      );
    }

    const { title, workstreamId, targetMonth, status, adoFeatureId, notes } = result.data;

    const workstream = await prisma.workstream.findUnique({
      where: { id: workstreamId },
    });
    if (!workstream) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: ['workstreamId must reference an existing workstream'],
        },
        { status: 400 }
      );
    }

    const milestone = await prisma.milestone.create({
      data: {
        title,
        workstreamId,
        targetMonth,
        status,
        adoFeatureId: adoFeatureId ?? undefined,
        notes: notes ?? undefined,
      },
      include: { workstream: true },
    });

    return NextResponse.json(formatMilestone(milestone), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
