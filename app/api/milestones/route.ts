/**
 * GET /api/milestones – Fetch milestones with progress data and program roll-up
 * Query params: workstreamId (optional) – filter by workstream
 * Response: { milestones: ApiMilestoneWithProgress[], programRollup: ApiProgramMilestoneRollup }
 *
 * POST /api/milestones – Create milestone
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
import { hasAdpMonTag } from '@/lib/milestones/format';
import type { MilestoneWorkstreamBreakdown } from '@/lib/milestones/types';
import { validateCreate } from '@/lib/milestones/validation';
import { prisma } from '@/lib/prisma';
import { mapStateToStatusGroup } from '@/lib/sprints/status-mapping';

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
    const workstreamId = searchParams.get('workstreamId');

    const where = workstreamId ? { workstreamId } : {};

    const milestones = await prisma.milestone.findMany({
      where,
      include: { workstream: true },
      orderBy: { targetMonth: 'asc' },
    });

    // Collect non-null ADO Feature IDs to look up child stories
    const featureAdoIds = milestones
      .map((m) => m.adoFeatureId)
      .filter((id): id is number => id !== null);

    // Query child UserStory WorkItems for all features in one pass
    const childStories =
      featureAdoIds.length > 0
        ? await prisma.workItem.findMany({
            where: {
              parentAdoId: { in: featureAdoIds },
              type: 'UserStory',
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
          })
        : [];

    // Filter to only ADP-MON-tagged stories before computing progress/breakdown
    const adpChildStories = childStories.filter((s) => hasAdpMonTag(s.tags ?? null));

    // Group child stories by parent ADO Feature ID
    const storiesByFeature = new Map<number, ChildStoryInput[]>();
    for (const story of adpChildStories) {
      if (story.parentAdoId === null) {
        continue;
      }
      const list = storiesByFeature.get(story.parentAdoId) ?? [];
      list.push({
        state: story.state,
        storyPoints: story.storyPoints,
        sprint: story.sprint
          ? { id: story.sprint.id, name: story.sprint.name, startDate: story.sprint.startDate }
          : null,
      });
      storiesByFeature.set(story.parentAdoId, list);
    }

    // Build per-workstream breakdown for each feature (uses adpChildStories — already filtered)
    const buildWorkstreamBreakdown = (featureAdoId: number): MilestoneWorkstreamBreakdown[] => {
      const byWorkstream = new Map<string, { name: string; stories: typeof adpChildStories }>();

      for (const story of adpChildStories) {
        if (story.parentAdoId !== featureAdoId || !story.workstreamId) {
          continue;
        }
        const entry = byWorkstream.get(story.workstreamId) ?? {
          name: story.workstream?.name ?? 'Unknown',
          stories: [],
        };
        entry.stories.push(story);
        byWorkstream.set(story.workstreamId, entry);
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

    // Build response milestones with progress fields + derived status
    const milestonesWithProgress = milestones.map((m) => {
      const base = formatMilestone(m);
      const quarter = ((m as Record<string, unknown>).quarter as string | null) ?? null;

      if (m.adoFeatureId === null) {
        return {
          ...base,
          status: deriveMilestoneStatus(null),
          completedPoints: 0,
          totalPoints: 0,
          percentComplete: null,
          quarter,
          burnupData: [],
          workstreamBreakdown: [],
        };
      }

      const children = storiesByFeature.get(m.adoFeatureId) ?? [];
      const progress = computeMilestoneProgress(m.adoFeatureId, children);

      return {
        ...base,
        status: deriveMilestoneStatus(progress.percentComplete),
        completedPoints: progress.completedSP,
        totalPoints: progress.totalSP,
        percentComplete: progress.percentComplete,
        quarter,
        burnupData: progress.burnupData,
        workstreamBreakdown: buildWorkstreamBreakdown(m.adoFeatureId),
      };
    });

    // Build program roll-up input
    const rollupInputs: MilestoneProgressInput[] = milestones.map((m, i) => {
      const mp = milestonesWithProgress[i];
      return {
        targetMonth: m.targetMonth,
        quarter: mp.quarter,
        progress:
          m.adoFeatureId !== null
            ? {
                adoFeatureId: m.adoFeatureId,
                totalSP: mp.totalPoints,
                completedSP: mp.completedPoints,
                percentComplete: mp.percentComplete,
                burnupData: mp.burnupData,
              }
            : null,
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
