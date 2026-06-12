/**
 * Pure metric calculator functions.
 * No database access, no side effects — receive pre-queried data, return computed results.
 * @module lib/metrics/calculators
 */

import { isIncluded } from './config-rules';
import {
  DONE_STATES,
  type CarryOverResult,
  type MetricRuleConfigInput,
  type OverheadResult,
  type PredictabilityResult,
  type SprintWorkstreamInput,
  type WorkItemInput,
} from './types';

function deliveryPointItems(
  workItems: WorkItemInput[],
  rules: MetricRuleConfigInput[] = []
): WorkItemInput[] {
  return workItems.filter((wi) => isIncluded(rules, 'deliveryPoints', wi.type));
}

// ---------------------------------------------------------------------------
// Velocity
// ---------------------------------------------------------------------------

/**
 * Sum of storyPoints for work items in Done-like states (Closed, Done, Resolved).
 * Bug and Spike items are excluded — their effort feeds Overhead hours, not velocity.
 * Null storyPoints are treated as 0. Always returns a number (0 when no done items).
 */
export function calculateVelocity(
  workItems: WorkItemInput[],
  rules: MetricRuleConfigInput[] = []
): number {
  return deliveryPointItems(workItems, rules)
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
  sprintWorkstream: SprintWorkstreamInput,
  rules: MetricRuleConfigInput[] = []
): OverheadResult {
  const ceremonyHours = sprintWorkstream.ceremonyHours ?? 0;

  const bugHours = workItems
    .filter((wi) => wi.type === 'Bug' && isIncluded(rules, 'overheadHours', wi.type))
    .reduce((sum, wi) => sum + (wi.completedWork ?? wi.originalEstimate ?? 0), 0);

  const spikeHours = workItems
    .filter((wi) => wi.type === 'Spike' && isIncluded(rules, 'overheadHours', wi.type))
    .reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  const supportHours = workItems
    .filter((wi) => wi.type === 'Support' && isIncluded(rules, 'overheadHours', wi.type))
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
 * - plannedPoints = sum of delivery items' storyPoints (null → 0)
 * - completedPoints = sum of Done-like delivery items' storyPoints (null → 0)
 * - Bug and Spike items are excluded — their effort feeds Overhead hours, not point plans.
 * - Returns null when plannedPoints = 0 (division by zero)
 */
export function calculatePredictability(
  workItems: WorkItemInput[],
  rules: MetricRuleConfigInput[] = []
): PredictabilityResult | null {
  const deliveryItems = deliveryPointItems(workItems, rules);
  const plannedPoints = deliveryItems.reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  if (plannedPoints === 0) {
    return null;
  }

  const completedPoints = deliveryItems
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
 * - carryOverItems = count of delivery items NOT in Done-like states
 * - carryOverPoints = sum of storyPoints for incomplete delivery items (null → 0)
 * - plannedPoints = sum of delivery items' storyPoints (null → 0)
 * - carryOverRate = carryOverPoints / plannedPoints × 100
 * - Bug and Spike items are excluded — their effort feeds Overhead hours, not point plans.
 * - Returns null when plannedPoints = 0 (division by zero)
 */
export function calculateCarryOver(
  workItems: WorkItemInput[],
  rules: MetricRuleConfigInput[] = []
): CarryOverResult | null {
  const deliveryItems = deliveryPointItems(workItems, rules);
  const plannedPoints = deliveryItems.reduce((sum, wi) => sum + (wi.storyPoints ?? 0), 0);

  if (plannedPoints === 0) {
    return null;
  }

  const incompleteItems = deliveryItems.filter(
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
