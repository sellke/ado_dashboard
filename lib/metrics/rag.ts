/**
 * RAG (Red/Amber/Green) assignment functions.
 * Pure functions — no database access, no side effects.
 * @module lib/metrics/rag
 */

import type { RagColor, ThresholdConfigInput } from './types';

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
export function assignVelocityRag(velocity: number | null, rollingAvg: number | null): RagColor {
  if (velocity === null || rollingAvg === null) {
    return null;
  }

  if (rollingAvg === 0) {
    return velocity > 0 ? 'Green' : null;
  }

  const ratio = velocity / rollingAvg;
  if (ratio >= 1.0) {
    return 'Green';
  }
  if (ratio >= 0.7) {
    return 'Amber';
  }
  return 'Red';
}
