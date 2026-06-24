import {
  isAdoCurrentFlagValid,
  isSprintActiveByDate,
  resolveCurrentSprint,
  resolveCurrentSprintId,
  type SprintCurrentInput,
} from '@/lib/sprint/resolve-current';

type TestSprint = SprintCurrentInput & { id: string; name?: string };

function sprint(
  id: string,
  start: string,
  end: string,
  isCurrent = false
): TestSprint {
  return {
    id,
    startDate: new Date(start),
    endDate: new Date(end),
    isCurrent,
  };
}

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('isSprintActiveByDate', () => {
  it('returns true when now is within start and end (inclusive)', () => {
    const s = sprint('a', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z');
    expect(isSprintActiveByDate(s, NOW)).toBe(true);
  });

  it('returns true on boundary startDate', () => {
    const s = sprint('a', '2026-06-15T12:00:00.000Z', '2026-06-20T00:00:00.000Z');
    expect(isSprintActiveByDate(s, NOW)).toBe(true);
  });

  it('returns true on boundary endDate', () => {
    const s = sprint('a', '2026-06-01T00:00:00.000Z', '2026-06-15T12:00:00.000Z');
    expect(isSprintActiveByDate(s, NOW)).toBe(true);
  });

  it('returns false when now is before startDate', () => {
    const s = sprint('a', '2026-06-20T00:00:00.000Z', '2026-07-04T00:00:00.000Z');
    expect(isSprintActiveByDate(s, NOW)).toBe(false);
  });

  it('returns false when now is after endDate', () => {
    const s = sprint('a', '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
    expect(isSprintActiveByDate(s, NOW)).toBe(false);
  });
});

describe('isAdoCurrentFlagValid', () => {
  it('returns true when isCurrent is true and dates are valid', () => {
    const s = sprint('a', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z', true);
    expect(isAdoCurrentFlagValid(s, NOW)).toBe(true);
  });

  it('returns false when isCurrent is false', () => {
    const s = sprint('a', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z', false);
    expect(isAdoCurrentFlagValid(s, NOW)).toBe(false);
  });

  it('returns false when isCurrent is true but endDate is in the past (stale flag)', () => {
    const s = sprint('a', '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z', true);
    expect(isAdoCurrentFlagValid(s, NOW)).toBe(false);
  });

  it('returns false when isCurrent is true but startDate is in the future', () => {
    const s = sprint('a', '2026-06-20T00:00:00.000Z', '2026-07-04T00:00:00.000Z', true);
    expect(isAdoCurrentFlagValid(s, NOW)).toBe(false);
  });
});

describe('resolveCurrentSprint', () => {
  it('returns null for empty input', () => {
    expect(resolveCurrentSprint([], NOW)).toBeNull();
  });

  it('returns null when all sprints are in the future', () => {
    const sprints = [
      sprint('future-1', '2026-06-20T00:00:00.000Z', '2026-07-04T00:00:00.000Z', true),
      sprint('future-2', '2026-07-05T00:00:00.000Z', '2026-07-18T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, NOW)).toBeNull();
  });

  it('returns the sprint with a valid ADO isCurrent flag', () => {
    const sprints = [
      sprint('past', '2026-05-01T00:00:00.000Z', '2026-05-14T00:00:00.000Z'),
      sprint('current', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z', true),
      sprint('future', '2026-06-20T00:00:00.000Z', '2026-07-04T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, NOW)?.id).toBe('current');
  });

  it('ignores stale isCurrent flag and falls through to date-range match', () => {
    const sprints = [
      sprint('stale', '2026-05-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z', true),
      sprint('active', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, NOW)?.id).toBe('active');
  });

  it('returns in-range sprint by date when no valid flag exists', () => {
    const sprints = [
      sprint('past', '2026-05-01T00:00:00.000Z', '2026-05-14T00:00:00.000Z'),
      sprint('active', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, NOW)?.id).toBe('active');
  });

  it('prefers isCurrent among overlapping in-range sprints', () => {
    const sprints = [
      sprint('overlap-a', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
      sprint('overlap-b', '2026-06-10T00:00:00.000Z', '2026-06-25T00:00:00.000Z', true),
    ];
    expect(resolveCurrentSprint(sprints, NOW)?.id).toBe('overlap-b');
  });

  it('picks max startDate among multiple valid flagged sprints', () => {
    const sprints = [
      sprint('flag-a', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z', true),
      sprint('flag-b', '2026-06-10T00:00:00.000Z', '2026-06-25T00:00:00.000Z', true),
    ];
    expect(resolveCurrentSprint(sprints, NOW)?.id).toBe('flag-b');
  });

  it('picks max startDate among overlapping in-range sprints without flags', () => {
    const sprints = [
      sprint('overlap-a', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z'),
      sprint('overlap-b', '2026-06-10T00:00:00.000Z', '2026-06-25T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, NOW)?.id).toBe('overlap-b');
  });

  it('returns most recent past sprint during a gap (no in-range sprint)', () => {
    const gapNow = new Date('2026-06-18T12:00:00.000Z');
    const sprints = [
      sprint('sprint-1', '2026-05-01T00:00:00.000Z', '2026-05-14T00:00:00.000Z'),
      sprint('sprint-2', '2026-05-15T00:00:00.000Z', '2026-05-28T00:00:00.000Z'),
      sprint('sprint-3', '2026-06-20T00:00:00.000Z', '2026-07-04T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, gapNow)?.id).toBe('sprint-2');
  });

  it('returns most recent past sprint when all sprints are past', () => {
    const pastNow = new Date('2026-07-01T00:00:00.000Z');
    const sprints = [
      sprint('sprint-1', '2026-05-01T00:00:00.000Z', '2026-05-14T00:00:00.000Z'),
      sprint('sprint-2', '2026-05-15T00:00:00.000Z', '2026-05-28T00:00:00.000Z'),
      sprint('sprint-3', '2026-06-01T00:00:00.000Z', '2026-06-14T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, pastNow)?.id).toBe('sprint-3');
  });

  it('ignores stale flag during gap and returns most recent past', () => {
    const gapNow = new Date('2026-06-18T12:00:00.000Z');
    const sprints = [
      sprint('stale', '2026-05-15T00:00:00.000Z', '2026-05-28T00:00:00.000Z', true),
      sprint('past', '2026-06-01T00:00:00.000Z', '2026-06-14T00:00:00.000Z'),
      sprint('future', '2026-06-20T00:00:00.000Z', '2026-07-04T00:00:00.000Z'),
    ];
    expect(resolveCurrentSprint(sprints, gapNow)?.id).toBe('past');
  });
});

describe('resolveCurrentSprintId', () => {
  it('returns id of resolved sprint', () => {
    const sprints = [
      sprint('current', '2026-06-01T00:00:00.000Z', '2026-06-20T00:00:00.000Z', true),
    ];
    expect(resolveCurrentSprintId(sprints, NOW)).toBe('current');
  });

  it('returns null when resolver returns null', () => {
    expect(resolveCurrentSprintId([], NOW)).toBeNull();
  });
});
