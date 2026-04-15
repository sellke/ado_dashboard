import { BUG_OPEN_STATES, BUG_RESOLVED_STATES } from './types';

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
}

function isDateWithinSprintWindow(
  value: Date | null | undefined,
  sprintStart: Date,
  sprintEnd: Date
): boolean {
  if (!value) return false;
  return value >= sprintStart && value <= sprintEnd;
}

// ---------------------------------------------------------------------------
// Program-level bug burndown (cross-sprint, time-based)
// ---------------------------------------------------------------------------

export interface BurndownBugInput {
  state: string;
  changedDate?: Date | null;
}

export interface BurndownSprintResult {
  sprintId: string;
  activeBugs: number;
  bugsClosed: number;
}

/**
 * Program-level bug burndown using backward reconstruction.
 *
 * Closed = bugs in a resolved state whose changedDate falls within the sprint window.
 * Open   = backward-reconstructed from the current total open count:
 *   open(latest)  = total currently-open bugs
 *   open(earlier) = open(next) + closed(next)
 *
 * @param sprintsAsc  Completed sprints in chronological order
 * @param allBugs     ALL bugs from the relevant workstreams (no sprint filter)
 */
export function computeBugBurndown(params: {
  sprintsAsc: TrendSprintRef[];
  allBugs: BurndownBugInput[];
}): BurndownSprintResult[] {
  const { sprintsAsc, allBugs } = params;

  const closedPerSprint = sprintsAsc.map((sprint) => ({
    sprintId: sprint.id,
    bugsClosed: allBugs.filter(
      (b) =>
        (BUG_RESOLVED_STATES as readonly string[]).includes(b.state) &&
        isDateWithinSprintWindow(b.changedDate, sprint.startDate, sprint.endDate)
    ).length,
  }));

  const currentOpen = allBugs.filter((b) =>
    (BUG_OPEN_STATES as readonly string[]).includes(b.state)
  ).length;

  const results: BurndownSprintResult[] = [];
  let runningOpen = currentOpen;

  for (let i = closedPerSprint.length - 1; i >= 0; i--) {
    results.unshift({
      sprintId: closedPerSprint[i].sprintId,
      activeBugs: runningOpen,
      bugsClosed: closedPerSprint[i].bugsClosed,
    });
    runningOpen += closedPerSprint[i].bugsClosed;
  }

  return results;
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

export function buildTrendSeries(params: {
  rollingSprintsDesc: TrendSprintRef[];
  currentSprintId: string | null;
  snapshots: TrendSnapshotInput[];
  bugItems: TrendBugInput[];
  workstreamId?: string;
}): TrendSeriesResult {
  const { rollingSprintsDesc, snapshots, bugItems, workstreamId } = params;
  const selectedCurrentSprintId = params.currentSprintId ?? rollingSprintsDesc[0]?.id ?? null;

  const scopeSnapshots = workstreamId
    ? snapshots.filter((s) => s.workstreamId === workstreamId)
    : snapshots;
  const scopeBugs = workstreamId
    ? bugItems.filter((b) => b.workstreamId === workstreamId)
    : bugItems;

  const actualSprintsAsc = rollingSprintsDesc
    .filter((s) => s.id !== selectedCurrentSprintId)
    .slice(0, 4)
    .reverse();

  const sprints: TrendSprintMetrics[] = actualSprintsAsc.map((sprint) => {
    const sprintSnapshots = scopeSnapshots.filter((s) => s.sprintId === sprint.id);
    const sprintVelocity = sumNullable(sprintSnapshots.map((s) => s.velocity));
    const sprintNetCapacity = sumNullable(
      sprintSnapshots.map((s) => calculateNetCapacityHours(s.grossHours, s.overheadHours))
    );
    const velocityRate = calculateVelocityRate(sprintVelocity, sprintNetCapacity);

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
      ? Math.round((velocityRates.reduce((sum, value) => sum + value, 0) / velocityRates.length) * 100) / 100
      : null;

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
      activeBugs: 0,
      bugsClosed: 0,
      mode: 'current',
    });
  }

  return { sprints, prediction, averageVelocityRate };
}
