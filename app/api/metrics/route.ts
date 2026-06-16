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
import {
  parseScopedWorkstreamIds,
  validateScopedWorkstreamIds,
} from '@/lib/dashboard/workstream-scope';
import { aggregateToProgram } from '@/lib/metrics/aggregator';
import { calculateCycleTime, createEmptyCycleTimeBreakdown } from '@/lib/metrics/calculators';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { assignDeliveryToBugRag } from '@/lib/metrics/rag';
import {
  buildTrendSeries,
  calculateDeliveryToBugRatio,
  computeBugBurndown,
} from '@/lib/metrics/trend-service';
import {
  CYCLE_TIME_WORK_ITEM_TYPES,
  DONE_STATES,
  type MetricWithRag,
  type ThresholdConfigInput,
  type WorkstreamMetrics,
} from '@/lib/metrics/types';
import { prisma } from '@/lib/prisma';
import { ROLLING_WINDOW_DEPTH } from '@/lib/sync/window';

/** Synthetic meeting hours per eligible member (dev / QA / BA) per sprint — dashboard charts only. */
const MEETING_HOURS_PER_ELIGIBLE_MEMBER_PER_SPRINT = 8.25;

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
      carryOverPoints: s.carryOverPoints,
      overheadHours: s.overheadHours,
      grossHours: s.grossHours,
    },
    cycleTime: createEmptyCycleTimeBreakdown(),
    trends: {
      sprints: [] as Array<{
        sprintId: string;
        sprintName: string;
        velocity: number | null;
        velocityRate: number | null;
        activeBugs: number;
        bugsClosed: number;
        mode: 'actual' | 'current';
        velocityAvg: number | null;
        overheadPercentAvg: number | null;
        carryOverRateAvg: number | null;
        plannedPoints: number | null;
        completedPoints: number | null;
        carryOverPoints: number | null;
        grossHours: number | null;
        overheadComposition: {
          ceremonyHours: number | null;
          bugHours: number | null;
          spikeHours: number | null;
          supportHours: number | null;
          totalOverheadHours: number | null;
          overheadPercent: number | null;
        };
        bugs: Array<{ adoId: number; title: string; state: string; isClosed?: boolean }>;
        overheadBreakdown: Array<{ category: string; hours: number }>;
      }>,
    },
    prediction: null as {
      velocity: number | null;
      velocityRate: number | null;
      deliveryToBugRatio: number | null;
      deliveryToBugRag: string | null;
      deliveryToBugVelocityRate?: number | null;
      deliveryToBugVelocityRateSource?: 'workstream' | 'program' | null;
      mode: 'predicted';
      formula: string;
    } | null,
    overheadItemsBySprint: [] as Array<{
      sprintId: string;
      bugs: Array<{ adoId: number; title: string; state: string; hours: number | null }>;
      spikes: Array<{ adoId: number; title: string; state: string; hours: number | null }>;
      support: Array<{ adoId: number; title: string; state: string; hours: number | null }>;
    }>,
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
    const scopedQuery = parseScopedWorkstreamIds(searchParams);

    if (scopedQuery.kind === 'invalid') {
      return NextResponse.json(
        { error: 'workstreamIds must include at least one workstream ID' },
        { status: 400 }
      );
    }

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
      where: { startDate: { lte: sprint.startDate } },
      orderBy: { startDate: 'desc' },
      take: ROLLING_WINDOW_DEPTH,
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    const isCurrentSprint = sprint.startDate <= now && sprint.endDate >= now;

    const allowedWorkstreams = await prisma.workstream.findMany({
      where: { name: { in: dashboardConfig.workstreamNames } },
      select: { id: true },
    });
    let allowedWsIds = allowedWorkstreams.map((w) => w.id);

    if (scopedQuery.kind === 'scoped') {
      const scopedWorkstreams = await prisma.workstream.findMany({
        where: { id: { in: scopedQuery.ids } },
        select: { id: true },
      });
      allowedWsIds = validateScopedWorkstreamIds(
        scopedQuery.ids,
        scopedWorkstreams.map((w) => w.id)
      );
    }

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
        velocityAvg: true,
        overheadPercentAvg: true,
        carryOverRateAvg: true,
        plannedPoints: true,
        completedPoints: true,
        carryOverPoints: true,
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
        adoId: true,
        title: true,
        state: true,
        completedWork: true,
        originalEstimate: true,
      },
      orderBy: { adoId: 'asc' },
    });
    const wsFilterForSW = workstreamIdParam
      ? { workstreamId: workstreamIdParam }
      : { workstreamId: { in: allowedWsIds } };
    const trendSprintWorkstreamsBase = await prisma.sprintWorkstream.findMany({
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

    // Fetch meetingOverheadMemberCount via raw SQL so this works even if the
    // Prisma client was generated before the column was added.
    const meetingOverheadMap = new Map<string, number | null>();
    try {
      const rows = await prisma.$queryRaw<
        Array<{ sprintId: string; workstreamId: string; meetingOverheadMemberCount: number | null }>
      >`
        SELECT "sprintId", "workstreamId", "meetingOverheadMemberCount"
        FROM "sprint_workstreams"
        WHERE "sprintId" = ANY(${rollingSprintIds}::text[])
      `;
      for (const row of rows) {
        meetingOverheadMap.set(
          `${row.sprintId}:${row.workstreamId}`,
          row.meetingOverheadMemberCount ?? null
        );
      }
    } catch {
      // Column not yet in DB — fall back to fteCount at usage site.
    }

    const trendSprintWorkstreams = trendSprintWorkstreamsBase.map((sw) => ({
      ...sw,
      meetingOverheadMemberCount:
        meetingOverheadMap.get(`${sw.sprintId}:${sw.workstreamId}`) ?? null,
    }));
    const trendBugInputs = trendBugs.map((bug) => ({
      sprintId: bug.sprintId,
      workstreamId: bug.workstreamId,
      state: bug.state,
      changedDate: bug.adoChangedDate,
    }));
    // ALL bugs for burndown charts (no sprint filter) — shared by workstream + program levels.
    const allBurndownBugs = await prisma.workItem.findMany({
      where: { type: 'Bug', ...wsFilter },
      select: {
        workstreamId: true,
        state: true,
        adoChangedDate: true,
        adoCreatedDate: true,
        adoId: true,
        title: true,
      },
    });

    const latestComputedAt = snapshots.reduce(
      (max, s) => (s.computedAt > max ? s.computedAt : max),
      snapshots[0]!.computedAt
    );
    const metricConfig = await loadMetricConfig(prisma);
    const thresholds: ThresholdConfigInput[] = metricConfig.thresholds;
    const cycleTimeSprints = await prisma.sprint.findMany({
      where: { startDate: { lte: sprint.startDate } },
      orderBy: { startDate: 'desc' },
      take: metricConfig.engine.cycleTimeRollingWindow,
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    const cycleTimeWindowSprints =
      cycleTimeSprints.length > 0
        ? cycleTimeSprints
        : [
            {
              id: sprint.id,
              name: sprint.name,
              startDate: sprint.startDate,
              endDate: sprint.endDate,
            },
          ];
    const cycleTimeStartDate = new Date(
      Math.min(...cycleTimeWindowSprints.map((s) => s.startDate.getTime()))
    );
    const cycleTimeEndDate = new Date(
      Math.max(...cycleTimeWindowSprints.map((s) => s.endDate.getTime()))
    );
    const cycleTimeSprintIds = cycleTimeWindowSprints.map((s) => s.id);
    const cycleTimeItems = await prisma.workItem.findMany({
      where: {
        type: { in: [...CYCLE_TIME_WORK_ITEM_TYPES] },
        ...wsFilter,
        OR: [
          { adoClosedDate: { gte: cycleTimeStartDate, lte: cycleTimeEndDate } },
          {
            adoClosedDate: null,
            sprintId: { in: cycleTimeSprintIds },
            state: { in: [...DONE_STATES] },
          },
        ],
      },
      select: {
        type: true,
        workstreamId: true,
        adoActivatedDate: true,
        adoClosedDate: true,
      },
    });
    const cycleTime = calculateCycleTime(cycleTimeItems, {
      startDate: cycleTimeStartDate,
      endDate: cycleTimeEndDate,
    });
    const cycleTimeByWorkstream = new Map(
      cycleTime.workstreams.map((ws) => [ws.workstreamId, ws.byType])
    );

    // When the active sprint is current, pull detail fields from the last completed sprint
    // so Planned/Completed/Carry-over reflect a closed sprint rather than mid-sprint partials.
    // Uses SprintPlanSnapshot for accurate carry-over data; falls back to MetricSnapshot.
    const priorDetailMap = new Map<
      string,
      {
        plannedPoints: number | null;
        completedPoints: number | null;
        carryOverPoints: number | null;
        carryOverRate: number | null;
        carryOverRateAvg: number | null;
        carryOverRag: string | null;
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

        // Try snapshot-based detail first (accurate carry-over for completed sprints)
        const priorPlanSnapshots = await prisma.sprintPlanSnapshot.findMany({
          where: { sprintId: priorSprint.id, workstreamId: { in: allowedWsIds } },
        });

        const priorMetricSnaps = await prisma.metricSnapshot.findMany({
          where: { sprintId: priorSprint.id, workstreamId: { in: allowedWsIds } },
          select: {
            workstreamId: true,
            plannedPoints: true,
            completedPoints: true,
            carryOverPoints: true,
            carryOverRate: true,
            carryOverRateAvg: true,
            carryOverRag: true,
            overheadHours: true,
            grossHours: true,
          },
        });

        // Only override detail when we have SprintPlanSnapshot data — without snapshots,
        // a completed sprint's MetricSnapshot shows planned≈completed (items already moved)
        // which would display misleading 100% completion. Fall back to current sprint detail.
        if (priorPlanSnapshots.length > 0) {
          for (const ms of priorMetricSnaps) {
            const wsSnaps = priorPlanSnapshots.filter((s) => s.workstreamId === ms.workstreamId);
            if (wsSnaps.length > 0) {
              const plannedPoints = wsSnaps.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
              const completedPoints = wsSnaps
                .filter((s) => (DONE_STATES as readonly string[]).includes(s.state))
                .reduce((sum, s) => sum + (s.storyPoints ?? 0), 0);
              const carryOverPoints = plannedPoints - completedPoints;
              const carryOverRate =
                plannedPoints > 0 ? (carryOverPoints / plannedPoints) * 100 : null;
              priorDetailMap.set(ms.workstreamId, {
                plannedPoints,
                completedPoints,
                carryOverPoints,
                carryOverRate,
                carryOverRateAvg: ms.carryOverRateAvg,
                carryOverRag: ms.carryOverRag,
                overheadHours: ms.overheadHours,
                grossHours: ms.grossHours,
              });
            }
          }
        } else {
          detailSprint = null;
        }
      }
    }

    const programTrends =
      includeProgram && snapshots.length > 0
        ? buildTrendSeries({
            rollingSprintsDesc: rollingSprints,
            currentSprintId: currentRollingSprintId,
            snapshots: trendSnapshots,
            bugItems: trendBugInputs,
            rollingWindow: metricConfig.engine.rollingWindow,
          })
        : null;

    const workstreams = snapshots.map((s) => {
      const formatted = formatWorkstreamResponse(s, includeRolling, isCurrentSprint);
      formatted.cycleTime =
        cycleTimeByWorkstream.get(s.workstreamId) ?? createEmptyCycleTimeBreakdown();
      if (isCurrentSprint) {
        const prior = priorDetailMap.get(s.workstreamId);
        if (prior) {
          formatted.detail = {
            plannedPoints: prior.plannedPoints,
            completedPoints: prior.completedPoints,
            carryOverPoints: prior.carryOverPoints,
            overheadHours: prior.overheadHours,
            grossHours: prior.grossHours,
          };
          formatted.metrics.carryOverRate = toMetricWithRag(
            prior.carryOverRate,
            prior.carryOverRateAvg,
            prior.carryOverRag,
            includeRolling
          );
        }
      }
      const trends = buildTrendSeries({
        rollingSprintsDesc: rollingSprints,
        currentSprintId: currentRollingSprintId,
        snapshots: trendSnapshots,
        bugItems: trendBugInputs,
        workstreamId: s.workstreamId,
        rollingWindow: metricConfig.engine.rollingWindow,
      });
      formatted.trends = {
        sprints: trends.sprints.map((sprint) => {
          const snap = trendSnapshots.find(
            (ts) => ts.sprintId === sprint.sprintId && ts.workstreamId === s.workstreamId
          );
          const wsId = s.workstreamId;
          const sprintId = sprint.sprintId;

          const swRow = trendSprintWorkstreams.find(
            (sw) => sw.sprintId === sprintId && sw.workstreamId === wsId
          );
          const meetingHeadcount = swRow?.meetingOverheadMemberCount ?? swRow?.fteCount ?? 0;
          const meetingHours = MEETING_HOURS_PER_ELIGIBLE_MEMBER_PER_SPRINT * meetingHeadcount;
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
            velocityAvg: snap?.velocityAvg ?? null,
            overheadPercentAvg: snap?.overheadPercentAvg ?? null,
            carryOverRateAvg: snap?.carryOverRateAvg ?? null,
            plannedPoints: snap?.plannedPoints ?? null,
            completedPoints: snap?.completedPoints ?? null,
            carryOverPoints: snap?.carryOverPoints ?? null,
            grossHours: snap?.grossHours ?? null,
            overheadComposition: (() => {
              const bugH = bugHoursBreakdown;
              const spikeH = spikeHours;
              const supportH = supportHoursBreakdown;
              const totalSynth = meetingHours + bugH + spikeH + supportH;
              const gross = snap?.grossHours ?? null;
              const pctSynth =
                gross !== null && gross !== undefined && gross > 0
                  ? (totalSynth / gross) * 100
                  : null;
              return {
                ceremonyHours: meetingHours,
                bugHours: bugH,
                spikeHours: spikeH,
                supportHours: supportH,
                totalOverheadHours: totalSynth,
                overheadPercent: pctSynth,
              };
            })(),
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

      // Per-workstream bug burndown: override sprint-assigned counts with time-based burndown.
      const wsBurndownBugs = allBurndownBugs
        .filter((b) => b.workstreamId === s.workstreamId)
        .map((b) => ({
          state: b.state,
          changedDate: b.adoChangedDate,
          createdDate: b.adoCreatedDate,
          adoId: b.adoId,
          title: b.title,
        }));
      const sprintRefMap = new Map(rollingSprints.map((rs) => [rs.id, rs]));
      const wsBurndown = computeBugBurndown({
        sprintsAsc: formatted.trends.sprints.map((ts: { sprintId: string; sprintName: string }) => {
          const ref = sprintRefMap.get(ts.sprintId)!;
          return {
            id: ts.sprintId,
            name: ts.sprintName,
            startDate: ref.startDate,
            endDate: ref.endDate,
          };
        }),
        allBugs: wsBurndownBugs,
      });
      for (const bd of wsBurndown) {
        const sprint = formatted.trends.sprints.find(
          (ts: { sprintId: string }) => ts.sprintId === bd.sprintId
        );
        if (sprint) {
          sprint.activeBugs = bd.activeBugs;
          sprint.bugsClosed = bd.bugsClosed;
          // Replace assignment-based bugs with the exact as-of population behind the bars.
          sprint.bugs = bd.bugs.map((b) => ({
            adoId: b.adoId,
            title: b.title,
            state: b.state,
            isClosed: b.isClosed,
          }));
        }
      }

      const deliveryToBugVelocityRate =
        trends.averageVelocityRate ?? programTrends?.averageVelocityRate ?? null;
      const deliveryToBugRatio = calculateDeliveryToBugRatio(
        trends.deliveryToBugCompletedPoints,
        trends.deliveryToBugHours,
        deliveryToBugVelocityRate
      );
      formatted.prediction = {
        velocity: trends.prediction.velocity,
        velocityRate: trends.averageVelocityRate,
        deliveryToBugRatio,
        deliveryToBugRag: assignDeliveryToBugRag(
          deliveryToBugRatio,
          trends.deliveryToBugCompletedPoints,
          trends.deliveryToBugHours,
          thresholds
        ),
        deliveryToBugVelocityRate,
        deliveryToBugVelocityRateSource:
          trends.averageVelocityRate !== null
            ? ('workstream' as const)
            : programTrends?.averageVelocityRate !== null &&
                programTrends?.averageVelocityRate !== undefined
              ? ('program' as const)
              : null,
        mode: 'predicted' as const,
        formula: trends.prediction.formula,
      };
      formatted.overheadItemsBySprint = rollingSprintIds.map((rsId) => ({
        sprintId: rsId,
        bugs: trendBugs
          .filter((b) => b.sprintId === rsId && b.workstreamId === s.workstreamId)
          .sort((a, b) => a.adoId - b.adoId)
          .map((b) => ({
            adoId: b.adoId,
            title: b.title,
            state: b.state,
            hours: b.completedWork ?? b.originalEstimate ?? null,
          })),
        spikes: trendSpikes
          .filter((sp) => sp.sprintId === rsId && sp.workstreamId === s.workstreamId)
          .sort((a, b) => a.adoId - b.adoId)
          .map((sp) => ({
            adoId: sp.adoId,
            title: sp.title,
            state: sp.state,
            hours: sp.completedWork ?? sp.originalEstimate ?? null,
          })),
        support: trendSupport
          .filter((sv) => sv.sprintId === rsId && sv.workstreamId === s.workstreamId)
          .sort((a, b) => a.adoId - b.adoId)
          .map((sv) => ({
            adoId: sv.adoId,
            title: sv.title,
            state: sv.state,
            hours: sv.completedWork ?? sv.originalEstimate ?? null,
          })),
      }));
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

      const prog = aggregateToProgram(wsMetrics, thresholds, metricConfig.engine);
      if (prog) {
        // Program-level bug burndown: reuse shared allBurndownBugs (no sprint filter).
        const progSprintRefMap = new Map(rollingSprints.map((rs) => [rs.id, rs]));
        const burndownResults = computeBugBurndown({
          sprintsAsc: programTrends!.sprints.map((s) => {
            const ref = progSprintRefMap.get(s.sprintId)!;
            return {
              id: s.sprintId,
              name: s.sprintName,
              startDate: ref.startDate,
              endDate: ref.endDate,
            };
          }),
          allBugs: allBurndownBugs.map((b) => ({
            state: b.state,
            changedDate: b.adoChangedDate,
            createdDate: b.adoCreatedDate,
          })),
        });
        for (const bd of burndownResults) {
          const sprint = programTrends!.sprints.find((s) => s.sprintId === bd.sprintId);
          if (sprint) {
            sprint.activeBugs = bd.activeBugs;
            sprint.bugsClosed = bd.bugsClosed;
          }
        }

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
            averageVelocityRate: programTrends!.averageVelocityRate,
            deliveryToBugRatio: programTrends!.deliveryToBugRatio,
            deliveryToBugRag: assignDeliveryToBugRag(
              programTrends!.deliveryToBugRatio,
              programTrends!.deliveryToBugCompletedPoints,
              programTrends!.deliveryToBugHours,
              thresholds
            ),
            milestoneMonthly: { value: null, rag: null },
            milestoneQuarterly: { value: null, rag: null },
          },
          cycleTime: cycleTime.program,
          trends: {
            sprints: programTrends!.sprints,
          },
          prediction: {
            sprint5: programTrends!.prediction,
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
      cycleTimeWindow: {
        count: cycleTimeWindowSprints.length,
        startDate: cycleTimeStartDate.toISOString(),
        endDate: cycleTimeEndDate.toISOString(),
        sprints: cycleTimeWindowSprints.map((s) => ({
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
