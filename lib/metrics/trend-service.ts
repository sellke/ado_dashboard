import { DONE_STATES } from './types';

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
  mode: 'actual';
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
  if (!value) {
    return false;
  }
  return value >= sprintStart && value <= sprintEnd;
}

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
  return doneLikeStoryPoints / netCapacityHours;
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
    const bugsClosed = sprintBugs.filter(
      (b) =>
        (DONE_STATES as readonly string[]).includes(b.state) &&
        isDateWithinSprintWindow(b.changedDate, sprint.startDate, sprint.endDate)
    ).length;
    const activeBugs = Math.max(sprintBugs.length - bugsClosed, 0);

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
      ? velocityRates.reduce((sum, value) => sum + value, 0) / velocityRates.length
      : null;

  const prediction: SprintPrediction = {
    velocity:
      averageVelocityRate !== null && currentNetCapacity !== null
        ? averageVelocityRate * currentNetCapacity
        : null,
    mode: 'predicted',
    formula: 'average velocity rate × current sprint net capacity hours',
  };

  return { sprints, prediction, averageVelocityRate };
}
