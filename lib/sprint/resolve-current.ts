export interface SprintCurrentInput {
  id?: string;
  startDate: Date;
  endDate: Date;
  isCurrent?: boolean;
}

function resolveNow(now?: Date): Date {
  return now ?? new Date();
}

export function isSprintActiveByDate(sprint: SprintCurrentInput, now?: Date): boolean {
  const at = resolveNow(now);
  return sprint.startDate <= at && at <= sprint.endDate;
}

export function isAdoCurrentFlagValid(sprint: SprintCurrentInput, now?: Date): boolean {
  if (!sprint.isCurrent) {
    return false;
  }
  const at = resolveNow(now);
  return sprint.startDate <= at && sprint.endDate >= at;
}

function pickMaxStartDate<T extends SprintCurrentInput>(candidates: T[]): T {
  return candidates.reduce((best, candidate) =>
    candidate.startDate > best.startDate ? candidate : best
  );
}

export function resolveCurrentSprint<T extends SprintCurrentInput>(
  sprints: T[],
  now?: Date
): T | null {
  const at = resolveNow(now);
  const candidates = sprints.filter((s) => s.startDate <= at);

  if (candidates.length === 0) {
    return null;
  }

  const flagged = candidates.filter((s) => isAdoCurrentFlagValid(s, at));
  if (flagged.length === 1) {
    return flagged[0];
  }
  if (flagged.length > 1) {
    return pickMaxStartDate(flagged);
  }

  const inRange = candidates.filter((s) => isSprintActiveByDate(s, at));
  if (inRange.length >= 1) {
    const flaggedInRange = inRange.filter((s) => s.isCurrent === true);
    if (flaggedInRange.length >= 1) {
      return pickMaxStartDate(flaggedInRange);
    }
    return pickMaxStartDate(inRange);
  }

  return pickMaxStartDate(candidates);
}

export function resolveCurrentSprintId<T extends SprintCurrentInput & { id: string }>(
  sprints: T[],
  now?: Date
): string | null {
  return resolveCurrentSprint(sprints, now)?.id ?? null;
}
