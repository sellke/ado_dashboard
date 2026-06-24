/**
 * Per-workstream metric snapshot computation.
 * Fetches work items, sprint capacity, prior snapshots; runs calculators; upserts MetricSnapshot.
 * @module lib/metrics/snapshot
 */

import type { PrismaClient, WorkItem } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveCurrentSprint } from '@/lib/sprint/resolve-current';
import {
  calculateCarryOver,
  calculateOverhead,
  calculatePredictability,
  calculateVelocity,
} from './calculators';
import { loadMetricConfig, type MetricConfigInput } from './config-loader';
import { assignRag, assignVelocityRag } from './rag';
import { calculateRollingAverages } from './rolling';
import type {
  PriorSnapshot,
  SprintWorkstreamInput,
  ThresholdConfigInput,
  WorkItemInput,
} from './types';

/** Map Prisma WorkItem to WorkItemInput for pure calculators */
function toWorkItemInput(wi: WorkItem): WorkItemInput {
  return {
    type: wi.type,
    state: wi.state,
    storyPoints: wi.storyPoints,
    originalEstimate: wi.originalEstimate,
    completedWork: wi.completedWork,
  };
}

/**
 * Compute metrics for a single workstream in a sprint and upsert MetricSnapshot.
 *
 * @param sprintId - Sprint ID
 * @param workstreamId - Workstream ID
 * @param currentSprintStart - Start date of current sprint (for prior snapshot query)
 * @param db - Optional Prisma client (for testing)
 * @returns The created/updated MetricSnapshot
 * @throws When sprint or workstream not found (invalid IDs)
 */
export async function computeWorkstreamMetrics(
  sprintId: string,
  workstreamId: string,
  currentSprintStart: Date,
  db: PrismaClient = prisma,
  metricConfig?: MetricConfigInput
): Promise<void> {
  // Validate sprint and workstream exist (invalid IDs → throw)
  const sprint = await db.sprint.findUnique({
    where: { id: sprintId },
    select: { id: true, startDate: true, endDate: true, isCurrent: true },
  });
  if (!sprint) {
    throw new Error(`Sprint not found: ${sprintId}`);
  }

  const workstreamExists = await db.workstream.findUnique({
    where: { id: workstreamId },
    select: { id: true },
  });
  if (!workstreamExists) {
    throw new Error(`Workstream not found: ${workstreamId}`);
  }

  const now = new Date();
  const pastSprints = await db.sprint.findMany({
    where: { startDate: { lte: now } },
    orderBy: { startDate: 'asc' },
    select: { id: true, startDate: true, endDate: true, isCurrent: true },
  });
  const isCurrentSprint = resolveCurrentSprint(pastSprints, now)?.id === sprint.id;

  // 1. Fetch work items
  const workItems = await db.workItem.findMany({
    where: { sprintId, workstreamId },
  });

  // 1b. Capture sprint plan snapshot for the current sprint (non-fatal)
  if (isCurrentSprint) {
    try {
      const capturedAt = new Date();
      await db.$transaction(async (tx) => {
        for (const wi of workItems) {
          await tx.sprintPlanSnapshot.upsert({
            where: {
              sprintId_workstreamId_adoId: {
                sprintId,
                workstreamId,
                adoId: wi.adoId,
              },
            },
            create: {
              sprintId,
              workstreamId,
              adoId: wi.adoId,
              storyPoints: wi.storyPoints,
              state: wi.state,
              type: wi.type,
              capturedAt,
            },
            update: {
              storyPoints: wi.storyPoints,
              state: wi.state,
              type: wi.type,
              capturedAt,
            },
          });
        }

        const currentAdoIds = workItems.map((wi) => wi.adoId);
        if (currentAdoIds.length > 0) {
          await tx.sprintPlanSnapshot.deleteMany({
            where: {
              sprintId,
              workstreamId,
              adoId: { notIn: currentAdoIds },
            },
          });
        } else {
          await tx.sprintPlanSnapshot.deleteMany({
            where: { sprintId, workstreamId },
          });
        }
      });
    } catch {
      // Non-fatal: snapshot failure must not block metric computation
    }
  }

  // 2. Fetch SprintWorkstream (grossHours, ceremonyHours)
  const sprintWs = await db.sprintWorkstream.findUnique({
    where: { sprintId_workstreamId: { sprintId, workstreamId } },
  });

  const swInput: SprintWorkstreamInput = sprintWs
    ? { grossHours: sprintWs.grossHours, ceremonyHours: sprintWs.ceremonyHours }
    : { grossHours: null, ceremonyHours: null };

  const wiInputs = workItems.map(toWorkItemInput);
  const config = metricConfig ?? (await loadMetricConfig(db));

  // 3–6. Run pure calculators
  const actualVelocity = calculateVelocity(wiInputs, config.rules);
  const overhead = calculateOverhead(wiInputs, swInput, config.rules);
  const predictabilityResult = calculatePredictability(wiInputs, config.rules);

  // For completed sprints, use snapshot data for carry-over if available
  let carryOverInput = wiInputs;
  if (!isCurrentSprint) {
    const snapshots = await db.sprintPlanSnapshot.findMany({
      where: { sprintId, workstreamId },
    });
    if (snapshots.length > 0) {
      carryOverInput = snapshots.map((s) => ({
        type: s.type,
        state: s.state,
        storyPoints: s.storyPoints,
        originalEstimate: null,
        completedWork: null,
      }));
    }
  }
  const carryOverResult = calculateCarryOver(carryOverInput, config.rules);

  // 7. Prior snapshots for rolling averages
  const priorSnapshots = await db.metricSnapshot.findMany({
    where: {
      workstreamId,
      sprint: { endDate: { lt: currentSprintStart } },
    },
    orderBy: { sprint: { endDate: 'desc' } },
    take: config.engine.rollingWindow,
    include: { sprint: true },
  });

  const priorInputs: PriorSnapshot[] = priorSnapshots.map((s) => ({
    velocity: s.velocity,
    overheadPercent: s.overheadPercent,
    predictability: s.predictability,
    carryOverRate: s.carryOverRate,
  }));

  const rollingAvgs = calculateRollingAverages(priorInputs);
  const velocity = isCurrentSprint ? rollingAvgs.velocityAvg : actualVelocity;

  // 8. Thresholds for RAG
  const thresholds: ThresholdConfigInput[] = config.thresholds;

  // 9. RAG assignment
  // Current sprint velocity is projected from prior sprints; avoid trend RAG on projections.
  const velocityRag = isCurrentSprint
    ? null
    : assignVelocityRag(velocity, rollingAvgs.velocityAvg, config.engine);
  const overheadRag = assignRag(overhead.overheadPercent, 'overheadPercent', thresholds);
  const predictabilityRag = assignRag(
    predictabilityResult?.predictability ?? null,
    'sprintPredictability',
    thresholds
  );
  const carryOverRag = assignRag(
    carryOverResult?.carryOverRate ?? null,
    'carryOverRate',
    thresholds
  );

  const computedAt = new Date();

  // 10. Upsert MetricSnapshot
  await db.metricSnapshot.upsert({
    where: { sprintId_workstreamId: { sprintId, workstreamId } },
    create: {
      sprintId,
      workstreamId,
      velocity,
      overheadPercent: overhead.overheadPercent,
      predictability: predictabilityResult?.predictability ?? null,
      carryOverRate: carryOverResult?.carryOverRate ?? null,
      carryOverItems: carryOverResult?.carryOverItems ?? null,
      carryOverPoints: carryOverResult?.carryOverPoints ?? null,
      plannedPoints: predictabilityResult?.plannedPoints ?? carryOverResult?.plannedPoints ?? null,
      completedPoints: predictabilityResult?.completedPoints ?? null,
      overheadHours: overhead.overheadHours,
      grossHours: sprintWs?.grossHours ?? null,
      ceremonyHours: overhead.ceremonyHours,
      bugHours: overhead.bugHours,
      spikeHours: overhead.spikeHours,
      supportHours: overhead.supportHours,
      velocityAvg: rollingAvgs.velocityAvg,
      overheadPercentAvg: rollingAvgs.overheadPercentAvg,
      predictabilityAvg: rollingAvgs.predictabilityAvg,
      carryOverRateAvg: rollingAvgs.carryOverRateAvg,
      velocityRag,
      overheadRag,
      predictabilityRag,
      carryOverRag,
      computedAt,
    },
    update: {
      velocity,
      overheadPercent: overhead.overheadPercent,
      predictability: predictabilityResult?.predictability ?? null,
      carryOverRate: carryOverResult?.carryOverRate ?? null,
      carryOverItems: carryOverResult?.carryOverItems ?? null,
      carryOverPoints: carryOverResult?.carryOverPoints ?? null,
      plannedPoints: predictabilityResult?.plannedPoints ?? carryOverResult?.plannedPoints ?? null,
      completedPoints: predictabilityResult?.completedPoints ?? null,
      overheadHours: overhead.overheadHours,
      grossHours: sprintWs?.grossHours ?? null,
      ceremonyHours: overhead.ceremonyHours,
      bugHours: overhead.bugHours,
      spikeHours: overhead.spikeHours,
      supportHours: overhead.supportHours,
      velocityAvg: rollingAvgs.velocityAvg,
      overheadPercentAvg: rollingAvgs.overheadPercentAvg,
      predictabilityAvg: rollingAvgs.predictabilityAvg,
      carryOverRateAvg: rollingAvgs.carryOverRateAvg,
      velocityRag,
      overheadRag,
      predictabilityRag,
      carryOverRag,
      computedAt,
    },
  });
}
