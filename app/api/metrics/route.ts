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
import { aggregateToProgram } from '@/lib/metrics/aggregator';
import { buildTrendSeries } from '@/lib/metrics/trend-service';
import type { MetricWithRag, ThresholdConfigInput, WorkstreamMetrics } from '@/lib/metrics/types';
import { prisma } from '@/lib/prisma';

/** Build API metric shape: value, optional avg, rag. */
function toMetricWithRag(
  value: number | null,
  avg: number | null,
  rag: string | null,
  includeAvg: boolean,
  mode?: 'actual' | 'projected'
): { value: number | null; avg?: number | null; rag: string | null; mode?: 'actual' | 'projected' } {
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
      }>,
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

    const where: { sprintId: string; workstreamId?: string } = { sprintId };
    if (workstreamIdParam) {
      where.workstreamId = workstreamIdParam;
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
          currentSprintId: rollingSprints.find((s) => s.startDate <= now && s.endDate >= now)?.id ?? null,
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
    const trendSnapshots = await prisma.metricSnapshot.findMany({
      where: {
        sprintId: { in: rollingSprintIds },
        ...(workstreamIdParam ? { workstreamId: workstreamIdParam } : {}),
      },
      select: {
        sprintId: true,
        workstreamId: true,
        velocity: true,
        grossHours: true,
        overheadHours: true,
      },
    });
    const trendBugs = await prisma.workItem.findMany({
      where: {
        type: 'Bug',
        sprintId: { in: rollingSprintIds },
        ...(workstreamIdParam ? { workstreamId: workstreamIdParam } : {}),
      },
      select: {
        sprintId: true,
        workstreamId: true,
        state: true,
      },
    });

    const latestComputedAt = snapshots.reduce(
      (max, s) => (s.computedAt > max ? s.computedAt : max),
      snapshots[0]!.computedAt
    );

    const workstreams = snapshots.map((s) => {
      const formatted = formatWorkstreamResponse(s, includeRolling, isCurrentSprint);
      const trends = buildTrendSeries({
        rollingSprintsDesc: rollingSprints,
        currentSprintId: currentRollingSprintId,
        snapshots: trendSnapshots,
        bugItems: trendBugs,
        workstreamId: s.workstreamId,
      });
      formatted.trends = { sprints: trends.sprints };
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
          bugItems: trendBugs,
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
      rollingWindow: {
        count: rollingSprints.length,
        currentSprintId: rollingSprints.find((s) => s.startDate <= now && s.endDate >= now)?.id ?? null,
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
