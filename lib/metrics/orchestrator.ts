/**
 * Metric computation orchestrator.
 * Computes metrics for all workstreams in a sprint, aggregates to program level.
 * @module lib/metrics/orchestrator
 */

import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { aggregateToProgram } from './aggregator';
import { loadMetricConfig, type MetricConfigInput } from './config-loader';
import { computeWorkstreamMetrics } from './snapshot';
import type {
  ComputeMetricsResult,
  MetricWithRag,
  ThresholdConfigInput,
  WorkstreamMetrics,
} from './types';

/**
 * Build WorkstreamMetrics from a MetricSnapshot row (for aggregateToProgram).
 */
function snapshotToWorkstreamMetrics(
  snapshot: {
    sprintId: string;
    workstreamId: string;
    velocity: number | null;
    overheadPercent: number | null;
    predictability: number | null;
    carryOverRate: number | null;
    carryOverItems: number | null;
    carryOverPoints: number | null;
    plannedPoints: number | null;
    completedPoints: number | null;
    overheadHours: number | null;
    grossHours: number | null;
    velocityAvg: number | null;
    overheadPercentAvg: number | null;
    predictabilityAvg: number | null;
    carryOverRateAvg: number | null;
    velocityRag: string | null;
    overheadRag: string | null;
    predictabilityRag: string | null;
    carryOverRag: string | null;
    computedAt: Date;
  },
  workstreamName: string,
  sprintName: string
): WorkstreamMetrics {
  const toMetricWithRag = (
    value: number | null,
    avg: number | null,
    rag: string | null
  ): MetricWithRag => ({
    value,
    average: avg,
    rag: rag as 'Green' | 'Amber' | 'Red' | null,
  });

  return {
    workstreamId: snapshot.workstreamId,
    workstreamName,
    sprintId: snapshot.sprintId,
    sprintName,
    velocity: toMetricWithRag(snapshot.velocity, snapshot.velocityAvg, snapshot.velocityRag),
    overheadPercent: toMetricWithRag(
      snapshot.overheadPercent,
      snapshot.overheadPercentAvg,
      snapshot.overheadRag
    ),
    predictability: toMetricWithRag(
      snapshot.predictability,
      snapshot.predictabilityAvg,
      snapshot.predictabilityRag
    ),
    carryOverRate: toMetricWithRag(
      snapshot.carryOverRate,
      snapshot.carryOverRateAvg,
      snapshot.carryOverRag
    ),
    carryOverItems: snapshot.carryOverItems,
    carryOverPoints: snapshot.carryOverPoints,
    plannedPoints: snapshot.plannedPoints,
    completedPoints: snapshot.completedPoints,
    overheadHours: snapshot.overheadHours,
    grossHours: snapshot.grossHours,
    computedAt: snapshot.computedAt,
  };
}

/** Options for computeAllMetrics (primarily for testing). */
export interface ComputeAllMetricsOptions {
  /** Prisma client override (for test isolation). */
  db?: PrismaClient;
  /** Per-workstream compute function override (for failure-injection tests). */
  computeFn?: (
    sprintId: string,
    workstreamId: string,
    sprintStart: Date,
    db: PrismaClient,
    metricConfig: MetricConfigInput
  ) => Promise<void>;
}

/**
 * Compute metrics for all workstreams in a sprint.
 * Each workstream is computed in isolation (one failure does not abort others).
 * Program aggregate is computed on-the-fly from successful workstream snapshots.
 *
 * @param sprintId - Sprint ID (defaults to most recent sprint by endDate if not provided)
 * @param dbOrOpts - Prisma client or options object (for testing)
 * @returns ComputeMetricsResult with workstreams, program aggregate, and errors
 */
export async function computeAllMetrics(
  sprintId?: string,
  dbOrOpts?: PrismaClient | ComputeAllMetricsOptions
): Promise<ComputeMetricsResult> {
  // Support both legacy `computeAllMetrics(id, prisma)` and new options form
  const opts: ComputeAllMetricsOptions =
    dbOrOpts && 'computeFn' in dbOrOpts ? dbOrOpts : { db: dbOrOpts as PrismaClient | undefined };
  const db = opts.db ?? prisma;
  const computeFn = opts.computeFn ?? computeWorkstreamMetrics;
  let targetSprintId = sprintId;

  if (!targetSprintId) {
    const latestSprint = await db.sprint.findFirst({
      orderBy: { endDate: 'desc' },
    });
    if (!latestSprint) {
      throw new Error('No sprints found');
    }
    targetSprintId = latestSprint.id;
  }

  const sprint = await db.sprint.findUnique({
    where: { id: targetSprintId },
    include: { workItems: true },
  });
  if (!sprint) {
    throw new Error(`Sprint not found: ${targetSprintId}`);
  }

  const workstreams = await db.workstream.findMany({ orderBy: { name: 'asc' } });
  const metricConfig = await loadMetricConfig(db);
  const errors: Array<{ workstreamId: string; error: string }> = [];
  const successfulWorkstreamIds: string[] = [];

  for (const ws of workstreams) {
    try {
      await computeFn(targetSprintId, ws.id, sprint.startDate, db, metricConfig);
      successfulWorkstreamIds.push(ws.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ workstreamId: ws.id, error: msg });
    }
  }

  const computedAt = new Date();

  // Fetch snapshots for successful workstreams (to build WorkstreamMetrics and program)
  const snapshots = await db.metricSnapshot.findMany({
    where: {
      sprintId: targetSprintId,
      workstreamId: { in: successfulWorkstreamIds },
    },
    include: { workstream: true },
  });

  const workstreamMetrics: WorkstreamMetrics[] = snapshots.map((s) =>
    snapshotToWorkstreamMetrics(s, s.workstream.name, sprint.name)
  );

  const thresholds: ThresholdConfigInput[] = metricConfig.thresholds;

  const program = aggregateToProgram(workstreamMetrics, thresholds, metricConfig.engine);

  return {
    sprintId: targetSprintId,
    sprintName: sprint.name,
    workstreams: workstreamMetrics,
    program,
    errors,
    computedAt,
  };
}
