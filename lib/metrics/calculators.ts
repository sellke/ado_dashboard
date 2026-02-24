/**
 * Pure metric calculator functions.
 * No database access, no side effects — receive pre-queried data, return computed results.
 * @module lib/metrics/calculators
 */

import {
  DONE_STATES,
  type CarryOverResult,
  type OverheadResult,
  type PredictabilityResult,
  type SprintWorkstreamInput,
  type WorkItemInput,
} from './types';

// ---------------------------------------------------------------------------
// Velocity
// ---------------------------------------------------------------------------

/**
 * Sum of storyPoints for work items in Done-like states (Closed, Done, Resolved).
 * Null storyPoints are treated as 0. Always returns a number (0 when no done items).
 */
export function calculateVelocity(workItems: WorkItemInput[]): number {
  return workItems
    .filter((wi) => (DONE_STATES as readonly string[]).includes(wi.state))
    .reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);
}

// ---------------------------------------------------------------------------
// Overhead
// ---------------------------------------------------------------------------

/**
 * Compute overhead hours and percentage.
 *
 * Overhead = (ceremonyHours + bugHours + spikeHours + supportHours) / grossHours × 100
 *
 * Hour sources per work item type:
 * - Bug:     completedWork ?? originalEstimate ?? 0
 * - Spike:   storyPoints × 1.0 (1 SP = 1 hour)
 * - Support: completedWork ?? originalEstimate ?? 0
 * - Ceremony: SprintWorkstream.ceremonyHours ?? 0
 *
 * Returns null overheadPercent when grossHours is null or 0.
 */
export function calculateOverhead(
  workItems: WorkItemInput[],
  sprintWorkstream: SprintWorkstreamInput
): OverheadResult {
  const ceremonyHours = sprintWorkstream.ceremonyHours ?? 0;

  const bugHours = workItems
    .filter((wi) => wi.type === 'Bug')
    .reduce((sum, wi) => sum + (wi.completedWork ?? wi.originalEstimate ?? 0), 0);

  const spikeHours = workItems
    .filter((wi) => wi.type === 'Spike')
    .reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  const supportHours = workItems
    .filter((wi) => wi.type === 'Support')
    .reduce((sum, wi) => sum + (wi.completedWork ?? wi.originalEstimate ?? 0), 0);

  const overheadHours = ceremonyHours + bugHours + spikeHours + supportHours;
  const grossHours = sprintWorkstream.grossHours;

  if (grossHours === null || grossHours === 0) {
    return {
      overheadHours,
      overheadPercent: null,
      ceremonyHours,
      bugHours,
      spikeHours,
      supportHours,
    };
  }

  return {
    overheadHours,
    overheadPercent: (overheadHours / grossHours) * 100,
    ceremonyHours,
    bugHours,
    spikeHours,
    supportHours,
  };
}

// ---------------------------------------------------------------------------
// Predictability
// ---------------------------------------------------------------------------

/**
 * Compute sprint predictability: completedPoints / plannedPoints × 100.
 *
 * - plannedPoints = sum of all items' storyPoints (null → 0)
 * - completedPoints = sum of Done-like items' storyPoints (null → 0)
 * - Returns null when plannedPoints = 0 (division by zero)
 */
export function calculatePredictability(workItems: WorkItemInput[]): PredictabilityResult | null {
  const plannedPoints = workItems.reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  if (plannedPoints === 0) {
    return null;
  }

  const completedPoints = workItems
    .filter((wi) => (DONE_STATES as readonly string[]).includes(wi.state))
    .reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  return {
    plannedPoints,
    completedPoints,
    predictability: (completedPoints / plannedPoints) * 100,
  };
}

// ---------------------------------------------------------------------------
// Carry-Over
// ---------------------------------------------------------------------------

/**
 * Compute carry-over metrics: items, points, and rate.
 *
 * - carryOverItems = count of items NOT in Done-like states
 * - carryOverPoints = sum of storyPoints for incomplete items (null → 0)
 * - plannedPoints = sum of all items' storyPoints (null → 0)
 * - carryOverRate = carryOverPoints / plannedPoints × 100
 * - Returns null when plannedPoints = 0 (division by zero)
 */
export function calculateCarryOver(workItems: WorkItemInput[]): CarryOverResult | null {
  const plannedPoints = workItems.reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  if (plannedPoints === 0) {
    return null;
  }

  const incompleteItems = workItems.filter(
    (wi) => !(DONE_STATES as readonly string[]).includes(wi.state)
  );

  const carryOverItems = incompleteItems.length;
  const carryOverPoints = incompleteItems.reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  return {
    carryOverItems,
    carryOverPoints,
    plannedPoints,
    carryOverRate: (carryOverPoints / plannedPoints) * 100,
  };
}
