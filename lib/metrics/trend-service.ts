import { BUG_OPEN_STATES, BUG_RESOLVED_STATES, DEFAULT_ENGINE_CONFIG } from './types';

export interface TrendSprintRef {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface TrendSnapshotInput {
  sprintId: string;
  workstreamId: string;
  velocity: number | null;
  grossHours: number | null;
  overheadHours: number | null;
  completedPoints?: number | null;
  bugHours?: number | null;
}

export interface TrendBugInput {
  sprintId: string | null;
  workstreamId: string | null;
  state: string;
  changedDate?: Date | null;
}

export interface TrendSprintMetrics {
  sprintId: string;
  sprintName: string;
  velocity: number | null;
  velocityRate: number | null;
  deliveryToBugRatio: number | null;
  deliveryToBugCompletedPoints: number | null;
  deliveryToBugHours: number | null;
  activeBugs: number;
  bugsClosed: number;
  mode: 'actual' | 'current';
}

export interface SprintPrediction {
  velocity: number | null;
  mode: 'predicted';
  formula: string;
}

export interface TrendSeriesResult {
  sprints: TrendSprintMetrics[];
  prediction: SprintPrediction;
  averageVelocityRate: number | null;
  deliveryToBugRatio: number | null;
  deliveryToBugCompletedPoints: number | null;
  deliveryToBugHours: number | null;
}

function isDateWithinSprintWindow(
  value: Date | null | undefined,
  sprintStart: Date,
  sprintEnd: Date
): boolean {
  if (!value) {
    return false;
  }
  return value >= sprintStart && value <= sprintEnd;
}

// ---------------------------------------------------------------------------
// Program-level bug burndown (cross-sprint, time-based)
// ---------------------------------------------------------------------------

export interface BurndownBugInput {
  state: string;
  changedDate?: Date | null;
  createdDate?: Date | null;
  adoId?: number;
  title?: string;
}

/**
 * A bug attributed to a sprint by the as-of burndown rule, with the classification
 * used by that sprint's bar (NOT the bug's current state). `isClosed: false` means the
 * bug was still open at sprint end; `isClosed: true` means it was resolved during the sprint.
 */
export interface BurndownBugListItem {
  adoId: number;
  title: string;
  state: string;
  isClosed: boolean;
}

export interface BurndownSprintResult {
  sprintId: string;
  activeBugs: number;
  bugsClosed: number;
  /** The exact bugs behind activeBugs (open) + bugsClosed (closed), so the list matches the bars. */
  bugs: BurndownBugListItem[];
}

function wasCreatedBySprintEnd(createdDate: Date | null | undefined, sprintEnd: Date): boolean {
  return !createdDate || createdDate <= sprintEnd;
}

function wasActiveAtSprintEnd(bug: BurndownBugInput, sprintEnd: Date): boolean {
  if (!wasCreatedBySprintEnd(bug.createdDate, sprintEnd)) {
    return false;
  }
  if ((BUG_OPEN_STATES as readonly string[]).includes(bug.state)) {
    return true;
  }
  if ((BUG_RESOLVED_STATES as readonly string[]).includes(bug.state)) {
    return bug.changedDate ? bug.changedDate > sprintEnd : false;
  }
  return false;
}

/**
 * Program-level bug burndown using direct as-of computation.
 *
 * Closed = bugs in a resolved state whose changedDate falls within the sprint window.
 * Open   = bugs created by sprint end that were still open as of sprint end.
 *
 * The ADO model only exposes one changedDate, so resolve/reopen churn is approximated
 * from the latest state and latest changedDate.
 *
 * @param sprintsAsc  Completed sprints in chronological order
 * @param allBugs     ALL bugs from the relevant workstreams (no sprint filter)
 */
export function computeBugBurndown(params: {
  sprintsAsc: TrendSprintRef[];
  allBugs: BurndownBugInput[];
}): BurndownSprintResult[] {
  const { sprintsAsc, allBugs } = params;

  const toListItem = (bug: BurndownBugInput, isClosed: boolean): BurndownBugListItem => ({
    adoId: bug.adoId ?? 0,
    title: bug.title ?? '',
    state: bug.state,
    isClosed,
  });

  return sprintsAsc.map((sprint) => {
    const openBugs = allBugs.filter((bug) => wasActiveAtSprintEnd(bug, sprint.endDate));
    const closedBugs = allBugs.filter(
      (b) =>
        (BUG_RESOLVED_STATES as readonly string[]).includes(b.state) &&
        isDateWithinSprintWindow(b.changedDate, sprint.startDate, sprint.endDate)
    );
    const bugs = [
      ...openBugs.map((b) => toListItem(b, false)),
      ...closedBugs.map((b) => toListItem(b, true)),
    ].sort((a, b) => a.adoId - b.adoId);

    return {
      sprintId: sprint.id,
      activeBugs: openBugs.length,
      bugsClosed: closedBugs.length,
      bugs,
    };
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sumNullable(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => v !== null && v !== undefined);
  if (valid.length === 0) {
    return null;
  }
  return valid.reduce((sum, value) => sum + value, 0);
}

/**
 * Net capacity follows the locked contract:
 * totalHours - overheadHours (where overhead includes bug/spike/support/ceremony work).
 */
export function calculateNetCapacityHours(
  totalHours: number | null | undefined,
  overheadHours: number | null | undefined
): number | null {
  if (totalHours === null || totalHours === undefined) {
    return null;
  }
  if (overheadHours === null || overheadHours === undefined) {
    return null;
  }
  return totalHours - overheadHours;
}

/**
 * velocityRate = doneLikeStoryPoints / netCapacityHours
 * Returns null for zero/negative/missing denominator.
 */
export function calculateVelocityRate(
  doneLikeStoryPoints: number | null | undefined,
  netCapacityHours: number | null | undefined
): number | null {
  if (doneLikeStoryPoints === null || doneLikeStoryPoints === undefined) {
    return null;
  }
  if (netCapacityHours === null || netCapacityHours === undefined || netCapacityHours <= 0) {
    return null;
  }
  return Math.round((doneLikeStoryPoints / netCapacityHours) * 100) / 100;
}

/**
 * deliveryToBugRatio = bug hours / completed delivery hours.
 * Delivery hours are completed story points converted through velocity rate (pts/hr).
 */
export function calculateDeliveryToBugRatio(
  completedPoints: number | null | undefined,
  bugHours: number | null | undefined,
  averageVelocityRate: number | null | undefined
): number | null {
  if (completedPoints === null || completedPoints === undefined) {
    return null;
  }
  if (bugHours === null || bugHours === undefined || bugHours <= 0) {
    return null;
  }
  if (
    averageVelocityRate === null ||
    averageVelocityRate === undefined ||
    averageVelocityRate <= 0
  ) {
    return null;
  }
  const deliveryHours = completedPoints / averageVelocityRate;
  if (deliveryHours <= 0) {
    return null;
  }
  return Math.round((bugHours / deliveryHours) * 100) / 100;
}

export function buildTrendSeries(params: {
  rollingSprintsDesc: TrendSprintRef[];
  currentSprintId: string | null;
  snapshots: TrendSnapshotInput[];
  bugItems: TrendBugInput[];
  workstreamId?: string;
  rollingWindow?: number;
}): TrendSeriesResult {
  const { rollingSprintsDesc, snapshots, bugItems, workstreamId } = params;
  const selectedCurrentSprintId = params.currentSprintId ?? null;
  const rollingWindow = params.rollingWindow ?? DEFAULT_ENGINE_CONFIG.rollingWindow;

  const scopeSnapshots = workstreamId
    ? snapshots.filter((s) => s.workstreamId === workstreamId)
    : snapshots;
  const scopeBugs = workstreamId
    ? bugItems.filter((b) => b.workstreamId === workstreamId)
    : bugItems;

  const actualSprintsAsc = selectedCurrentSprintId
    ? rollingSprintsDesc
        .filter((s) => s.id !== selectedCurrentSprintId)
        .slice(0, rollingWindow)
        .reverse()
    : rollingSprintsDesc.slice(0, rollingWindow).reverse();

  const sprints: TrendSprintMetrics[] = actualSprintsAsc.map((sprint) => {
    const sprintSnapshots = scopeSnapshots.filter((s) => s.sprintId === sprint.id);
    const sprintVelocity = sumNullable(sprintSnapshots.map((s) => s.velocity));
    const sprintNetCapacity = sumNullable(
      sprintSnapshots.map((s) => calculateNetCapacityHours(s.grossHours, s.overheadHours))
    );
    const velocityRate = calculateVelocityRate(sprintVelocity, sprintNetCapacity);
    const deliveryToBugCompletedPoints = sumNullable(sprintSnapshots.map((s) => s.completedPoints));
    const deliveryToBugHours = sumNullable(sprintSnapshots.map((s) => s.bugHours));

    const sprintBugs = scopeBugs.filter((b) => b.sprintId === sprint.id);
    const bugsClosed = sprintBugs.filter((b) =>
      (BUG_RESOLVED_STATES as readonly string[]).includes(b.state)
    ).length;
    const activeBugs = sprintBugs.filter((b) =>
      (BUG_OPEN_STATES as readonly string[]).includes(b.state)
    ).length;

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      velocity: sprintVelocity,
      velocityRate,
      deliveryToBugRatio: null,
      deliveryToBugCompletedPoints,
      deliveryToBugHours,
      activeBugs,
      bugsClosed,
      mode: 'actual',
    };
  });

  const currentSnapshots = scopeSnapshots.filter((s) => s.sprintId === selectedCurrentSprintId);
  const currentNetCapacity = sumNullable(
    currentSnapshots.map((s) => calculateNetCapacityHours(s.grossHours, s.overheadHours))
  );

  const velocityRates = sprints
    .map((s) => s.velocityRate)
    .filter((value): value is number => value !== null);
  const averageVelocityRate =
    velocityRates.length > 0
      ? Math.round(
          (velocityRates.reduce((sum, value) => sum + value, 0) / velocityRates.length) * 100
        ) / 100
      : null;

  const actualSprintIds = new Set(actualSprintsAsc.map((sprint) => sprint.id));
  const deliveryToBugSnapshots = scopeSnapshots.filter((snapshot) =>
    actualSprintIds.has(snapshot.sprintId)
  );
  const deliveryToBugCompletedPoints = sumNullable(
    deliveryToBugSnapshots.map((snapshot) => snapshot.completedPoints)
  );
  const deliveryToBugHours = sumNullable(
    deliveryToBugSnapshots.map((snapshot) => snapshot.bugHours)
  );
  const deliveryToBugRatio = calculateDeliveryToBugRatio(
    deliveryToBugCompletedPoints,
    deliveryToBugHours,
    averageVelocityRate
  );
  for (const sprint of sprints) {
    sprint.deliveryToBugRatio = calculateDeliveryToBugRatio(
      sprint.deliveryToBugCompletedPoints,
      sprint.deliveryToBugHours,
      averageVelocityRate
    );
  }

  const prediction: SprintPrediction = {
    velocity:
      averageVelocityRate !== null && currentNetCapacity !== null
        ? Math.round(averageVelocityRate * currentNetCapacity * 100) / 100
        : null,
    mode: 'predicted',
    formula: 'average velocity rate × current sprint net capacity hours',
  };

  const currentRef = rollingSprintsDesc.find((s) => s.id === selectedCurrentSprintId);
  if (currentRef) {
    const currentVelocity = sumNullable(currentSnapshots.map((s) => s.velocity));
    const currentVelocityRate = calculateVelocityRate(currentVelocity, currentNetCapacity);
    sprints.push({
      sprintId: currentRef.id,
      sprintName: currentRef.name,
      velocity: currentVelocity,
      velocityRate: currentVelocityRate,
      deliveryToBugRatio: null,
      deliveryToBugCompletedPoints: sumNullable(currentSnapshots.map((s) => s.completedPoints)),
      deliveryToBugHours: sumNullable(currentSnapshots.map((s) => s.bugHours)),
      activeBugs: 0,
      bugsClosed: 0,
      mode: 'current',
    });
  }

  return {
    sprints,
    prediction,
    averageVelocityRate,
    deliveryToBugRatio,
    deliveryToBugCompletedPoints,
    deliveryToBugHours,
  };
}
