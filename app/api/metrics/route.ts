/**
 * GET /api/metrics – Fetch computed metrics for a sprint
 *
 * Query params:
 * - sprintId (optional): defaults to latest sprint with snapshots
 * - workstreamId (optional): filter by workstream
 * - includeRolling (boolean, default true): include avg in metric objects
 * - includeProgram (boolean, default true): include program aggregate
 *
 * Response: { sprint, workstreams, program?, computedAt }
 * When no data: { sprint: null, workstreams: [], program: null, computedAt: null }
 */

import { NextResponse } from 'next/server';
import { resolveDashboard } from '@/lib/dashboard/config';
import { aggregateToProgram } from '@/lib/metrics/aggregator';
import { buildTrendSeries } from '@/lib/metrics/trend-service';
import type { MetricWithRag, ThresholdConfigInput, WorkstreamMetrics } from '@/lib/metrics/types';
import { prisma } from '@/lib/prisma';

/** Hours of meeting/ceremony overhead per team member per sprint (Story 6). */
const MEETING_HOURS_PER_MEMBER_PER_SPRINT = 10.25;

/** Build API metric shape: value, optional avg, rag. */
function toMetricWithRag(
  value: number | null,
  avg: number | null,
  rag: string | null,
  includeAvg: boolean,
  mode?: 'actual' | 'projected'
): {
  value: number | null;
  avg?: number | null;
  rag: string | null;
  mode?: 'actual' | 'projected';
} {
  const m: {
    value: number | null;
    avg?: number | null;
    rag: string | null;
    mode?: 'actual' | 'projected';
  } = {
    value,
    rag: rag as 'Green' | 'Amber' | 'Red' | null,
  };
  if (includeAvg) {
    m.avg = avg;
  }
  if (mode) {
    m.mode = mode;
  }
  return m;
}

/** Map MetricSnapshot + workstream to API workstream response shape. */
function formatWorkstreamResponse(
  s: {
    workstreamId: string;
    workstream: { name: string };
    velocity: number | null;
    overheadPercent: number | null;
    predictability: number | null;
    carryOverRate: number | null;
    velocityAvg: number | null;
    overheadPercentAvg: number | null;
    predictabilityAvg: number | null;
    carryOverRateAvg: number | null;
    velocityRag: string | null;
    overheadRag: string | null;
    predictabilityRag: string | null;
    carryOverRag: string | null;
    carryOverItems: number | null;
    carryOverPoints: number | null;
    plannedPoints: number | null;
    completedPoints: number | null;
    overheadHours: number | null;
    grossHours: number | null;
    computedAt: Date;
  },
  includeRolling: boolean,
  isCurrentSprint: boolean
) {
  return {
    workstreamId: s.workstreamId,
    workstreamName: s.workstream.name,
    metrics: {
      velocity: toMetricWithRag(
        s.velocity,
        s.velocityAvg,
        s.velocityRag,
        includeRolling,
        isCurrentSprint ? 'projected' : 'actual'
      ),
      overheadPercent: toMetricWithRag(
        s.overheadPercent,
        s.overheadPercentAvg,
        s.overheadRag,
        includeRolling
      ),
      predictability: toMetricWithRag(
        s.predictability,
        s.predictabilityAvg,
        s.predictabilityRag,
        includeRolling
      ),
      carryOverRate: toMetricWithRag(
        s.carryOverRate,
        s.carryOverRateAvg,
        s.carryOverRag,
        includeRolling
      ),
    },
    detail: {
      plannedPoints: s.plannedPoints,
      completedPoints: s.completedPoints,
      carryOverItems: s.carryOverItems,
      carryOverPoints: s.carryOverPoints,
      overheadHours: s.overheadHours,
      grossHours: s.grossHours,
    },
    trends: {
      sprints: [] as Array<{
        sprintId: string;
        sprintName: string;
        velocity: number | null;
        velocityRate: number | null;
        activeBugs: number;
        bugsClosed: number;
        mode: 'actual';
        overheadComposition: {
          ceremonyHours: number | null;
          bugHours: number | null;
          spikeHours: number | null;
          supportHours: number | null;
          totalOverheadHours: number | null;
          overheadPercent: number | null;
        };
        bugs: Array<{ adoId: number; title: string; state: string }>;
        overheadBreakdown: Array<{ category: string; hours: number }>;
      }>,
    },
    prediction: null as {
      velocity: number | null;
      velocityRate: number | null;
      mode: 'predicted';
      formula: string;
    } | null,
    currentSprintOverheadItems: {
      bugs: [] as Array<{ adoId: number; title: string; state: string; hours: number | null }>,
      support: [] as Array<{ adoId: number; title: string; state: string; hours: number | null }>,
    },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sprintIdParam = searchParams.get('sprintId');
    const workstreamIdParam = searchParams.get('workstreamId');
    const includeRolling = searchParams.get('includeRolling') !== 'false';
    const includeProgram = searchParams.get('includeProgram') !== 'false';
    const dashboardConfig = resolveDashboard(searchParams.get('dashboard'));

    let sprintId = sprintIdParam;
    const now = new Date();

    if (!sprintId) {
      const latestWithSnapshot = await prisma.metricSnapshot.findFirst({
        orderBy: { computedAt: 'desc' },
        select: { sprintId: true },
      });
      if (!latestWithSnapshot) {
        return NextResponse.json({
          sprint: null,
          workstreams: [],
          program: null,
          computedAt: null,
        });
      }
      sprintId = latestWithSnapshot.sprintId;
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) {
      return NextResponse.json({
        sprint: null,
        workstreams: [],
        program: includeProgram ? null : undefined,
        computedAt: null,
      });
    }

    const rollingSprints = await prisma.sprint.findMany({
      orderBy: { startDate: 'desc' },
      take: 5,
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    const isCurrentSprint = sprint.startDate <= now && sprint.endDate >= now;

    const allowedWorkstreams = await prisma.workstream.findMany({
      where: { name: { in: dashboardConfig.workstreamNames } },
      select: { id: true },
    });
    const allowedWsIds = allowedWorkstreams.map((w) => w.id);

    const where: { sprintId: string; workstreamId?: string | { in: string[] } } = { sprintId };
    if (workstreamIdParam) {
      where.workstreamId = workstreamIdParam;
    } else {
      where.workstreamId = { in: allowedWsIds };
    }

    const snapshots = await prisma.metricSnapshot.findMany({
      where,
      include: { workstream: true },
      orderBy: { workstream: { name: 'asc' } },
    });

    if (snapshots.length === 0) {
      const payload: Record<string, unknown> = {
        sprint: {
          id: sprint.id,
          name: sprint.name,
          startDate: sprint.startDate.toISOString(),
          endDate: sprint.endDate.toISOString(),
        },
        rollingWindow: {
          count: rollingSprints.length,
          currentSprintId:
            rollingSprints.find((s) => s.startDate <= now && s.endDate >= now)?.id ?? null,
          sprints: rollingSprints.map((s) => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate.toISOString(),
            endDate: s.endDate.toISOString(),
          })),
        },
        workstreams: [],
        computedAt: null,
      };
      if (includeProgram) {
        payload.program = null;
      }
      return NextResponse.json(payload);
    }

    const currentRollingSprintId =
      rollingSprints.find((s) => s.startDate <= now && s.endDate >= now)?.id ?? null;
    const rollingSprintIds = rollingSprints.map((s) => s.id);
    const wsFilter = workstreamIdParam
      ? { workstreamId: workstreamIdParam }
      : { workstreamId: { in: allowedWsIds } };

    const trendSnapshots = await prisma.metricSnapshot.findMany({
      where: {
        sprintId: { in: rollingSprintIds },
        ...wsFilter,
      },
      select: {
        sprintId: true,
        workstreamId: true,
        velocity: true,
        grossHours: true,
        overheadHours: true,
        overheadPercent: true,
        ceremonyHours: true,
        bugHours: true,
        spikeHours: true,
        supportHours: true,
      },
    });
    const trendBugs = await prisma.workItem.findMany({
      where: {
        type: 'Bug',
        sprintId: { in: rollingSprintIds },
        ...wsFilter,
      },
      select: {
        sprintId: true,
        workstreamId: true,
        state: true,
        adoChangedDate: true,
        adoId: true,
        title: true,
        completedWork: true,
        originalEstimate: true,
      },
      orderBy: { adoId: 'asc' },
    });
    const trendSupport = await prisma.workItem.findMany({
      where: {
        type: 'Support',
        sprintId: { in: rollingSprintIds },
        ...wsFilter,
      },
      select: {
        sprintId: true,
        workstreamId: true,
        adoId: true,
        title: true,
        state: true,
        completedWork: true,
        originalEstimate: true,
      },
      orderBy: { adoId: 'asc' },
    });
    const trendSpikes = await prisma.workItem.findMany({
      where: {
        type: 'Spike',
        sprintId: { in: rollingSprintIds },
        ...wsFilter,
      },
      select: {
        sprintId: true,
        workstreamId: true,
        storyPoints: true,
      },
    });
    const wsFilterForSW = workstreamIdParam
      ? { workstreamId: workstreamIdParam }
      : { workstreamId: { in: allowedWsIds } };
    const trendSprintWorkstreams = await prisma.sprintWorkstream.findMany({
      where: {
        sprintId: { in: rollingSprintIds },
        ...wsFilterForSW,
      },
      select: {
        sprintId: true,
        workstreamId: true,
        fteCount: true,
      },
    });
    const trendBugInputs = trendBugs.map((bug) => ({
      sprintId: bug.sprintId,
      workstreamId: bug.workstreamId,
      state: bug.state,
      changedDate: bug.adoChangedDate,
    }));

    const latestComputedAt = snapshots.reduce(
      (max, s) => (s.computedAt > max ? s.computedAt : max),
      snapshots[0]!.computedAt
    );

    // When the active sprint is current, pull detail fields from the last completed sprint
    // so Planned/Completed/Carry-over reflect a closed sprint rather than mid-sprint partials.
    const priorDetailMap = new Map<
      string,
      {
        plannedPoints: number | null;
        completedPoints: number | null;
        carryOverItems: number | null;
        carryOverPoints: number | null;
        overheadHours: number | null;
        grossHours: number | null;
      }
    >();
    let detailSprint: { name: string; startDate: string; endDate: string } | null = null;
    if (isCurrentSprint) {
      const priorSprint = await prisma.sprint.findFirst({
        where: { endDate: { lt: now } },
        orderBy: { endDate: 'desc' },
      });
      if (priorSprint) {
        detailSprint = {
          name: priorSprint.name,
          startDate: priorSprint.startDate.toISOString(),
          endDate: priorSprint.endDate.toISOString(),
        };
        const priorSnaps = await prisma.metricSnapshot.findMany({
          where: { sprintId: priorSprint.id, workstreamId: { in: allowedWsIds } },
          select: {
            workstreamId: true,
            plannedPoints: true,
            completedPoints: true,
            carryOverItems: true,
            carryOverPoints: true,
            overheadHours: true,
            grossHours: true,
          },
        });
        for (const ps of priorSnaps) {
          priorDetailMap.set(ps.workstreamId, ps);
        }
      }
    }

    const workstreams = snapshots.map((s) => {
      const formatted = formatWorkstreamResponse(s, includeRolling, isCurrentSprint);
      if (isCurrentSprint) {
        const prior = priorDetailMap.get(s.workstreamId);
        if (prior) {
          formatted.detail = prior;
        }
      }
      const trends = buildTrendSeries({
        rollingSprintsDesc: rollingSprints,
        currentSprintId: currentRollingSprintId,
        snapshots: trendSnapshots,
        bugItems: trendBugInputs,
        workstreamId: s.workstreamId,
      });
      formatted.trends = {
        sprints: trends.sprints.map((sprint) => {
          const snap = trendSnapshots.find(
            (ts) => ts.sprintId === sprint.sprintId && ts.workstreamId === s.workstreamId
          );
          const wsId = s.workstreamId;
          const sprintId = sprint.sprintId;

          const meetingFteCount =
            trendSprintWorkstreams.find(
              (sw) => sw.sprintId === sprintId && sw.workstreamId === wsId
            )?.fteCount ?? 0;
          const meetingHours = MEETING_HOURS_PER_MEMBER_PER_SPRINT * meetingFteCount;
          const spikeHours = trendSpikes
            .filter((sp) => sp.sprintId === sprintId && sp.workstreamId === wsId)
            .reduce((sum, sp) => sum + (sp.storyPoints ?? 0), 0);
          const bugHoursBreakdown = trendBugs
            .filter((b) => b.sprintId === sprintId && b.workstreamId === wsId)
            .reduce((sum, b) => sum + (b.completedWork ?? b.originalEstimate ?? 0), 0);
          const supportHoursBreakdown = trendSupport
            .filter((sv) => sv.sprintId === sprintId && sv.workstreamId === wsId)
            .reduce((sum, sv) => sum + (sv.completedWork ?? sv.originalEstimate ?? 0), 0);

          return {
            ...sprint,
            overheadComposition: {
              ceremonyHours: snap?.ceremonyHours ?? null,
              bugHours: snap?.bugHours ?? null,
              spikeHours: snap?.spikeHours ?? null,
              supportHours: snap?.supportHours ?? null,
              totalOverheadHours: snap?.overheadHours ?? null,
              overheadPercent: snap?.overheadPercent ?? null,
            },
            bugs: trendBugs
              .filter((b) => b.sprintId === sprintId && b.workstreamId === wsId)
              .sort((a, b) => a.adoId - b.adoId)
              .map((b) => ({ adoId: b.adoId, title: b.title, state: b.state })),
            overheadBreakdown: [
              { category: 'Meetings', hours: meetingHours },
              { category: 'Spikes', hours: spikeHours },
              { category: 'Bugs', hours: bugHoursBreakdown },
              { category: 'Support', hours: supportHoursBreakdown },
            ],
          };
        }),
      };
      formatted.prediction = {
        velocity: trends.prediction.velocity,
        velocityRate: trends.averageVelocityRate,
        mode: 'predicted' as const,
        formula: trends.prediction.formula,
      };
      formatted.currentSprintOverheadItems = {
        bugs: trendBugs
          .filter((b) => b.sprintId === sprintId && b.workstreamId === s.workstreamId)
          .sort((a, b) => a.adoId - b.adoId)
          .map((b) => ({
            adoId: b.adoId,
            title: b.title,
            state: b.state,
            hours: b.completedWork ?? b.originalEstimate ?? null,
          })),
        support: trendSupport
          .filter((sv) => sv.sprintId === sprintId && sv.workstreamId === s.workstreamId)
          .sort((a, b) => a.adoId - b.adoId)
          .map((sv) => ({
            adoId: sv.adoId,
            title: sv.title,
            state: sv.state,
            hours: sv.completedWork ?? sv.originalEstimate ?? null,
          })),
      };
      return formatted;
    });

    let program: Record<string, unknown> | null = null;
    if (includeProgram && snapshots.length > 0) {
      const wsMetrics: WorkstreamMetrics[] = snapshots.map((s) => ({
        workstreamId: s.workstreamId,
        workstreamName: s.workstream.name,
        sprintId: sprint.id,
        sprintName: sprint.name,
        velocity: {
          value: s.velocity,
          average: s.velocityAvg,
          rag: s.velocityRag as 'Green' | 'Amber' | 'Red' | null,
        },
        overheadPercent: {
          value: s.overheadPercent,
          average: s.overheadPercentAvg,
          rag: s.overheadRag as 'Green' | 'Amber' | 'Red' | null,
        },
        predictability: {
          value: s.predictability,
          average: s.predictabilityAvg,
          rag: s.predictabilityRag as 'Green' | 'Amber' | 'Red' | null,
        },
        carryOverRate: {
          value: s.carryOverRate,
          average: s.carryOverRateAvg,
          rag: s.carryOverRag as 'Green' | 'Amber' | 'Red' | null,
        },
        carryOverItems: s.carryOverItems,
        carryOverPoints: s.carryOverPoints,
        plannedPoints: s.plannedPoints,
        completedPoints: s.completedPoints,
        overheadHours: s.overheadHours,
        grossHours: s.grossHours,
        computedAt: s.computedAt,
      }));

      const thresholds: ThresholdConfigInput[] = (await prisma.thresholdConfig.findMany()).map(
        (t) => ({
          metricName: t.metricName,
          greenMin: t.greenMin,
          greenMax: t.greenMax,
          amberMin: t.amberMin,
          amberMax: t.amberMax,
        })
      );

      const prog = aggregateToProgram(wsMetrics, thresholds);
      if (prog) {
        const programTrends = buildTrendSeries({
          rollingSprintsDesc: rollingSprints,
          currentSprintId: currentRollingSprintId,
          snapshots: trendSnapshots,
          bugItems: trendBugInputs,
        });
        const toMetric = (m: MetricWithRag, inc: boolean) => {
          const o: {
            value: number | null;
            avg?: number | null;
            rag: string | null;
            mode?: 'actual' | 'projected';
          } = {
            value: m.value,
            rag: m.rag,
          };
          if (inc) {
            o.avg = m.average;
          }
          return o;
        };
        const programVelocity = toMetric(prog.velocity, includeRolling);
        programVelocity.mode = isCurrentSprint ? 'projected' : 'actual';
        program = {
          metrics: {
            velocity: programVelocity,
            overheadPercent: toMetric(prog.overheadPercent, includeRolling),
            predictability: toMetric(prog.predictability, includeRolling),
            carryOverRate: toMetric(prog.carryOverRate, includeRolling),
            averageVelocityRate: programTrends.averageVelocityRate,
            milestoneMonthly: { value: null, rag: null },
            milestoneQuarterly: { value: null, rag: null },
          },
          trends: {
            sprints: programTrends.sprints,
          },
          prediction: {
            sprint5: programTrends.prediction,
          },
        };
      }
    }

    const payload: Record<string, unknown> = {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        startDate: sprint.startDate.toISOString(),
        endDate: sprint.endDate.toISOString(),
      },
      detailSprint,
      rollingWindow: {
        count: rollingSprints.length,
        currentSprintId:
          rollingSprints.find((s) => s.startDate <= now && s.endDate >= now)?.id ?? null,
        sprints: rollingSprints.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
        })),
      },
      workstreams,
      computedAt: latestComputedAt.toISOString(),
    };
    if (includeProgram) {
      payload.program = program;
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
