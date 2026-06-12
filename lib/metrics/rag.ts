/**
 * RAG (Red/Amber/Green) assignment functions.
 * Pure functions — no database access, no side effects.
 * @module lib/metrics/rag
 */

import {
  DEFAULT_ENGINE_CONFIG,
  type MetricEngineConfigInput,
  type RagColor,
  type ThresholdConfigInput,
} from './types';

// ---------------------------------------------------------------------------
// Threshold-based RAG
// ---------------------------------------------------------------------------

/**
 * Assign RAG color based on threshold configuration.
 *
 * - Returns null if value is null or no config found for metricName
 * - Checks green range first, then amber; defaults to Red
 */
export function assignRag(
  value: number | null,
  metricName: string,
  thresholds: ThresholdConfigInput[]
): RagColor {
  if (value === null) {
    return null;
  }

  const config = thresholds.find((t) => t.metricName === metricName);
  if (!config) {
    return null;
  }

  if (value >= config.greenMin && value <= config.greenMax) {
    return 'Green';
  }
  if (value >= config.amberMin && value <= config.amberMax) {
    return 'Amber';
  }
  return 'Red';
}

/**
 * Assign delivery-to-bug RAG with the zero-bug healthy case.
 *
 * Finite ratios delegate to seeded `deliveryToBugRatio` thresholds where lower is healthier.
 */
export function assignDeliveryToBugRag(
  ratio: number | null,
  completedPoints: number | null | undefined,
  bugHours: number | null | undefined,
  thresholds: ThresholdConfigInput[]
): RagColor {
  if (
    bugHours === 0 &&
    completedPoints !== null &&
    completedPoints !== undefined &&
    completedPoints > 0
  ) {
    return 'Green';
  }
  if (ratio === null) {
    return null;
  }
  return assignRag(ratio, 'deliveryToBugRatio', thresholds);
}

// ---------------------------------------------------------------------------
// Velocity trend-based RAG
// ---------------------------------------------------------------------------

/**
 * Assign velocity RAG based on trend vs rolling average.
 *
 * - Green: velocity >= rolling average (ratio >= 1.0)
 * - Amber: velocity is 70–99% of rolling average
 * - Red: velocity < 70% of rolling average
 * - null: when velocity or rolling average is null
 * - Special: when rollingAvg = 0 and velocity > 0 → Green; both 0 → null
 */
export function assignVelocityRag(
  velocity: number | null,
  rollingAvg: number | null,
  config: Pick<
    MetricEngineConfigInput,
    'velocityGreenFloor' | 'velocityAmberFloor'
  > = DEFAULT_ENGINE_CONFIG
): RagColor {
  if (velocity === null || rollingAvg === null) {
    return null;
  }

  if (rollingAvg === 0) {
    return velocity > 0 ? 'Green' : null;
  }

  const ratio = velocity / rollingAvg;
  if (ratio >= config.velocityGreenFloor) {
    return 'Green';
  }
  if (ratio >= config.velocityAmberFloor) {
    return 'Amber';
  }
  return 'Red';
}
