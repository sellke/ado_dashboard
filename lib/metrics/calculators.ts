/**
 * Pure metric calculator functions.
 * No database access, no side effects — receive pre-queried data, return computed results.
 * @module lib/metrics/calculators
 */

import { isIncluded } from './config-rules';
import {
  CYCLE_TIME_WORK_ITEM_TYPES,
  DONE_STATES,
  type CarryOverResult,
  type CycleTimeBreakdown,
  type CycleTimeByType,
  type CycleTimeResult,
  type CycleTimeWindow,
  type CycleTimeWorkItemInput,
  type CycleTimeWorkItemType,
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

function isCycleTimeWorkItemType(type: string): type is CycleTimeWorkItemType {
  return (CYCLE_TIME_WORK_ITEM_TYPES as readonly string[]).includes(type);
}

function emptyCycleTimeByType(): CycleTimeByType {
  return {
    totalBusinessDays: 0,
    averageBusinessDays: null,
    completedItemCount: 0,
    unavailableItemCount: 0,
  };
}

export function createEmptyCycleTimeBreakdown(): CycleTimeBreakdown {
  return {
    UserStory: emptyCycleTimeByType(),
    Spike: emptyCycleTimeByType(),
    Bug: emptyCycleTimeByType(),
  };
}

function cloneCycleTimeBreakdown(source: CycleTimeBreakdown): CycleTimeBreakdown {
  return {
    UserStory: { ...source.UserStory },
    Spike: { ...source.Spike },
    Bug: { ...source.Bug },
  };
}

function isDateInWindow(date: Date, window: CycleTimeWindow): boolean {
  return date >= window.startDate && date <= window.endDate;
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

// ---------------------------------------------------------------------------
// Cycle Time
// ---------------------------------------------------------------------------

/**
 * Count inclusive Monday-Friday calendar days touched by a lifecycle span.
 * Returns null when dates are missing, invalid, or reversed.
 */
export function calculateBusinessDaysElapsed(start: Date | null, end: Date | null): number | null {
  if (!start || !end) {
    return null;
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  const endDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  let businessDays = 0;

  while (cursor <= endDate) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      businessDays++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return businessDays;
}

/**
 * Calculate cycle-time totals and averages by work item type for program and workstreams.
 *
 * The configured window is based on done timestamp (`adoClosedDate`). Items with missing
 * lifecycle dates are counted as unavailable within the pre-queried input scope.
 */
export function calculateCycleTime(
  workItems: CycleTimeWorkItemInput[],
  window: CycleTimeWindow
): CycleTimeResult {
  const program = createEmptyCycleTimeBreakdown();
  const workstreams = new Map<string, CycleTimeBreakdown>();
  const workstreamIds = new Map<string, string | null>();

  for (const item of workItems) {
    if (!isCycleTimeWorkItemType(item.type)) {
      continue;
    }

    if (item.adoClosedDate && !isDateInWindow(item.adoClosedDate, window)) {
      continue;
    }

    const key = item.workstreamId ?? '__unassigned__';
    if (!workstreams.has(key)) {
      workstreams.set(key, createEmptyCycleTimeBreakdown());
      workstreamIds.set(key, item.workstreamId);
    }

    const programBucket = program[item.type];
    const workstreamBucket = workstreams.get(key)![item.type];
    const businessDays = calculateBusinessDaysElapsed(item.adoActivatedDate, item.adoClosedDate);

    if (businessDays === null) {
      programBucket.unavailableItemCount++;
      workstreamBucket.unavailableItemCount++;
      continue;
    }

    programBucket.totalBusinessDays += businessDays;
    programBucket.completedItemCount++;
    workstreamBucket.totalBusinessDays += businessDays;
    workstreamBucket.completedItemCount++;
  }

  finalizeCycleTimeBreakdown(program);
  for (const breakdown of Array.from(workstreams.values())) {
    finalizeCycleTimeBreakdown(breakdown);
  }

  return {
    program: cloneCycleTimeBreakdown(program),
    workstreams: Array.from(workstreams.entries()).map(([key, byType]) => ({
      workstreamId: workstreamIds.get(key) ?? null,
      byType: cloneCycleTimeBreakdown(byType),
    })),
  };
}

function finalizeCycleTimeBreakdown(breakdown: CycleTimeBreakdown): void {
  for (const type of CYCLE_TIME_WORK_ITEM_TYPES) {
    const bucket = breakdown[type];
    bucket.averageBusinessDays =
      bucket.completedItemCount === 0 ? null : bucket.totalBusinessDays / bucket.completedItemCount;
  }
}
