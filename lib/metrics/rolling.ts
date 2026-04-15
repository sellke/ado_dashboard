/**
 * Rolling average calculation across prior sprint snapshots.
 * Pure function — no database access, no side effects.
 * @module lib/metrics/rolling
 */

import type { PriorSnapshot, RollingAverages } from './types';

/**
 * Compute arithmetic mean of non-null metric values from prior sprint snapshots.
 *
 * - Uses up to 4 prior sprints (caller is responsible for providing the correct window)
 * - For each metric: average of non-null values
 * - If all values are null for a metric, the average is null
 * - Empty input → all null averages
 */
export function calculateRollingAverages(priorSnapshots: PriorSnapshot[]): RollingAverages {
  return {
    velocityAvg: averageNonNull(priorSnapshots.map((s) => s.velocity)),
    overheadPercentAvg: averageNonNull(priorSnapshots.map((s) => s.overheadPercent)),
    predictabilityAvg: averageNonNull(priorSnapshots.map((s) => s.predictability)),
    carryOverRateAvg: averageNonNull(priorSnapshots.map((s) => s.carryOverRate)),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Arithmetic mean of non-null values, rounded to the nearest hundredth. Returns null if all values are null or array is empty. */
function averageNonNull(values: (number | null)[]): number | null {
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) {
    return null;
  }
  return Math.round((nonNull.reduce((sum, v) => sum + v, 0) / nonNull.length) * 100) / 100;
}
