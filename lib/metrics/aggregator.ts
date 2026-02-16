/**
 * Program-level metric aggregation across workstreams.
 * Pure function — no database access, no side effects.
 * @module lib/metrics/aggregator
 */

import { assignRag, assignVelocityRag } from './rag';
import type {
  MetricWithRag,
  ProgramMetrics,
  ThresholdConfigInput,
  WorkstreamMetrics,
} from './types';

/**
 * Aggregate per-workstream metrics to program level.
 *
 * - Velocity: simple SUM of all workstream velocities (not weighted)
 * - Overhead%, Predictability, CarryOverRate: weighted average by plannedPoints
 * - Skips workstreams with null metric value or null/0 plannedPoints for weighted metrics
 * - Returns null if no workstream metrics provided
 */
export function aggregateToProgram(
  workstreamMetrics: WorkstreamMetrics[],
  thresholds: ThresholdConfigInput[]
): ProgramMetrics | null {
  if (workstreamMetrics.length === 0) {
    return null;
  }

  const first = workstreamMetrics[0];

  // --- Velocity: simple SUM ---
  const velocityValue = sumNonNull(workstreamMetrics.map((ws) => ws.velocity.value));
  const velocityAvg = sumNonNull(workstreamMetrics.map((ws) => ws.velocity.average));

  // --- Weighted metrics ---
  const overheadValue = weightedAverage(workstreamMetrics, (ws) => ws.overheadPercent.value);
  const overheadAvg = weightedAverage(workstreamMetrics, (ws) => ws.overheadPercent.average);

  const predictabilityValue = weightedAverage(workstreamMetrics, (ws) => ws.predictability.value);
  const predictabilityAvg = weightedAverage(workstreamMetrics, (ws) => ws.predictability.average);

  const carryOverValue = weightedAverage(workstreamMetrics, (ws) => ws.carryOverRate.value);
  const carryOverAvg = weightedAverage(workstreamMetrics, (ws) => ws.carryOverRate.average);

  // --- Totals ---
  const totalPlannedPoints = workstreamMetrics.reduce(
    (sum, ws) => sum + (ws.plannedPoints ?? 0),
    0
  );
  const totalCompletedPoints = workstreamMetrics.reduce(
    (sum, ws) => sum + (ws.completedPoints ?? 0),
    0
  );
  const totalOverheadHours = workstreamMetrics.reduce(
    (sum, ws) => sum + (ws.overheadHours ?? 0),
    0
  );
  const totalGrossHours = workstreamMetrics.reduce((sum, ws) => sum + (ws.grossHours ?? 0), 0);

  // --- Build MetricWithRag ---
  const velocity: MetricWithRag = {
    value: velocityValue,
    average: velocityAvg,
    rag: assignVelocityRag(velocityValue, velocityAvg),
  };

  const overheadPercent: MetricWithRag = {
    value: overheadValue,
    average: overheadAvg,
    rag: assignRag(overheadValue, 'overheadPercent', thresholds),
  };

  const predictability: MetricWithRag = {
    value: predictabilityValue,
    average: predictabilityAvg,
    rag: assignRag(predictabilityValue, 'sprintPredictability', thresholds),
  };

  const carryOverRate: MetricWithRag = {
    value: carryOverValue,
    average: carryOverAvg,
    rag: assignRag(carryOverValue, 'carryOverRate', thresholds),
  };

  return {
    sprintId: first.sprintId,
    sprintName: first.sprintName,
    velocity,
    overheadPercent,
    predictability,
    carryOverRate,
    totalPlannedPoints,
    totalCompletedPoints,
    totalOverheadHours,
    totalGrossHours,
    workstreamCount: workstreamMetrics.length,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sum non-null values. Returns null only if all values are null.
 * Returns 0 if all non-null values sum to 0.
 */
function sumNonNull(values: (number | null)[]): number | null {
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) {
    return null;
  }
  return nonNull.reduce((sum, v) => sum + v, 0);
}

/**
 * Weighted average by plannedPoints.
 * Skips workstreams with null metric value or null/0 plannedPoints.
 * Returns null if no valid workstreams.
 */
function weightedAverage(
  workstreamMetrics: WorkstreamMetrics[],
  getValue: (ws: WorkstreamMetrics) => number | null
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const ws of workstreamMetrics) {
    const value = getValue(ws);
    const weight = ws.plannedPoints;

    if (value === null || weight === null || weight === 0) {
      continue;
    }

    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return null;
  }
  return weightedSum / totalWeight;
}
