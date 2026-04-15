import {
  buildTrendSeries,
  calculateNetCapacityHours,
  calculateVelocityRate,
  computeBugBurndown,
} from '@/lib/metrics/trend-service';

describe('trend-service formulas', () => {
  it('calculates net capacity using total minus overhead', () => {
    expect(calculateNetCapacityHours(80, 20)).toBe(60);
  });

  it('returns null net capacity when total or overhead is missing', () => {
    expect(calculateNetCapacityHours(null, 20)).toBeNull();
    expect(calculateNetCapacityHours(80, null)).toBeNull();
  });

  it('calculates velocity rate when denominator is valid', () => {
    expect(calculateVelocityRate(30, 60)).toBe(0.5);
  });

  it('returns null velocity rate for zero or missing denominator', () => {
    expect(calculateVelocityRate(30, 0)).toBeNull();
    expect(calculateVelocityRate(30, null)).toBeNull();
  });
});

describe('buildTrendSeries', () => {
  const rollingSprintsDesc = [
    {
      id: 's5',
      name: 'Sprint 5',
      startDate: new Date('2026-02-17'),
      endDate: new Date('2026-03-02'),
    },
    {
      id: 's4',
      name: 'Sprint 4',
      startDate: new Date('2026-02-03'),
      endDate: new Date('2026-02-16'),
    },
    {
      id: 's3',
      name: 'Sprint 3',
      startDate: new Date('2026-01-20'),
      endDate: new Date('2026-02-02'),
    },
    {
      id: 's2',
      name: 'Sprint 2',
      startDate: new Date('2026-01-06'),
      endDate: new Date('2026-01-19'),
    },
    {
      id: 's1',
      name: 'Sprint 1',
      startDate: new Date('2025-12-23'),
      endDate: new Date('2026-01-05'),
    },
  ];

  it('builds sprint trends and computes Sprint 5 prediction', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        {
          sprintId: 's5',
          workstreamId: 'ws-1',
          velocity: null,
          grossHours: 100,
          overheadHours: 20,
        },
      ],
      bugItems: [
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          state: 'Active',
          changedDate: new Date('2025-12-30'),
        },
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          state: 'Closed',
          changedDate: new Date('2026-01-10'),
        },
        {
          sprintId: 's3',
          workstreamId: 'ws-1',
          state: 'Resolved',
          changedDate: new Date('2026-01-28'),
        },
        { sprintId: 's4', workstreamId: 'ws-1', state: 'New', changedDate: new Date('2026-02-12') },
        // Not assigned to target sprint (excluded)
        {
          sprintId: null,
          workstreamId: 'ws-1',
          state: 'Active',
          changedDate: new Date('2026-02-01'),
        },
      ],
      workstreamId: 'ws-1',
    });

    expect(result.sprints).toHaveLength(5);
    expect(result.sprints[0]).toMatchObject({
      sprintId: 's1',
      velocity: 10,
      velocityRate: 0.17,
      activeBugs: 1,
      bugsClosed: 0,
      mode: 'actual',
    });
    expect(result.sprints[3]).toMatchObject({
      sprintId: 's4',
      activeBugs: 1,
      bugsClosed: 0,
    });
    expect(result.sprints[4]).toMatchObject({
      sprintId: 's5',
      velocity: null,
      velocityRate: null,
      activeBugs: 0,
      bugsClosed: 0,
      mode: 'current',
    });

    // Per-sprint rates are rounded to 2 decimals; avg rate then rounds again; pred = avg × net
    expect(result.prediction.mode).toBe('predicted');
    expect(result.prediction.velocity).toBeCloseTo(13.6, 1);
    expect(result.prediction.formula).toContain('average velocity rate');
  });

  it('counts all resolved bugs assigned to a sprint regardless of changedDate', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        {
          sprintId: 's5',
          workstreamId: 'ws-1',
          velocity: null,
          grossHours: 100,
          overheadHours: 20,
        },
      ],
      bugItems: [
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          state: 'Resolved',
          changedDate: new Date('2026-01-03'),
        },
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          state: 'Closed',
          changedDate: new Date('2026-01-20'),
        },
      ],
      workstreamId: 'ws-1',
    });

    expect(result.sprints[0]).toMatchObject({
      sprintId: 's1',
      activeBugs: 0,
      bugsClosed: 2,
    });
  });

  it('counts Testing state as resolved (closed)', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's5', workstreamId: 'ws-1', velocity: null, grossHours: 100, overheadHours: 20 },
      ],
      bugItems: [
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          state: 'Testing',
          changedDate: new Date('2026-01-12'),
        },
      ],
      workstreamId: 'ws-1',
    });

    expect(result.sprints[1]).toMatchObject({
      sprintId: 's2',
      activeBugs: 0,
      bugsClosed: 1,
    });
  });

  it('excludes bugs in states outside both open and resolved sets', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's5', workstreamId: 'ws-1', velocity: null, grossHours: 100, overheadHours: 20 },
      ],
      bugItems: [
        { sprintId: 's1', workstreamId: 'ws-1', state: 'Done', changedDate: new Date('2026-01-01') },
        { sprintId: 's1', workstreamId: 'ws-1', state: 'Removed', changedDate: new Date('2026-01-01') },
        { sprintId: 's1', workstreamId: 'ws-1', state: 'Active', changedDate: new Date('2026-01-01') },
      ],
      workstreamId: 'ws-1',
    });

    expect(result.sprints[0]).toMatchObject({
      sprintId: 's1',
      activeBugs: 1,
      bugsClosed: 0,
    });
  });

  it('emits current sprint as 5th entry with mode current when currentSprintId exists', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's5', workstreamId: 'ws-1', velocity: 6, grossHours: 100, overheadHours: 20 },
      ],
      bugItems: [],
      workstreamId: 'ws-1',
    });

    expect(result.sprints).toHaveLength(5);
    const current = result.sprints[4];
    expect(current.sprintId).toBe('s5');
    expect(current.sprintName).toBe('Sprint 5');
    expect(current.mode).toBe('current');
    expect(current.velocity).toBe(6);
    expect(current.activeBugs).toBe(0);
    expect(current.bugsClosed).toBe(0);
    expect(result.sprints.slice(0, 4).every((s) => s.mode === 'actual')).toBe(true);
  });

  it('emits current sprint with null velocity when snapshot has no velocity', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's5', workstreamId: 'ws-1', velocity: null, grossHours: 100, overheadHours: 20 },
      ],
      bugItems: [],
      workstreamId: 'ws-1',
    });

    const current = result.sprints.find((s) => s.sprintId === 's5');
    expect(current).toBeDefined();
    expect(current!.mode).toBe('current');
    expect(current!.velocity).toBeNull();
  });

  it('returns 4 entries when no currentSprintId is provided (no regression)', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: null,
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
      ],
      bugItems: [],
      workstreamId: 'ws-1',
    });

    // With null currentSprintId, selectedCurrentSprintId falls back to rollingSprintsDesc[0].id = 's5'
    // s5 has no snapshot so velocity is null — it still gets appended as current
    // The 4 actual sprints (s1-s4) are all present
    expect(result.sprints.filter((s) => s.mode === 'actual')).toHaveLength(4);
  });

  it('explicitly matches New and Active for the open bucket', () => {
    const result = buildTrendSeries({
      rollingSprintsDesc,
      currentSprintId: 's5',
      snapshots: [
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 8, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's5', workstreamId: 'ws-1', velocity: null, grossHours: 100, overheadHours: 20 },
      ],
      bugItems: [
        { sprintId: 's3', workstreamId: 'ws-1', state: 'New', changedDate: new Date('2026-01-25') },
        { sprintId: 's3', workstreamId: 'ws-1', state: 'Active', changedDate: new Date('2026-01-26') },
        { sprintId: 's3', workstreamId: 'ws-1', state: 'Resolved', changedDate: new Date('2026-01-28') },
      ],
      workstreamId: 'ws-1',
    });

    expect(result.sprints[2]).toMatchObject({
      sprintId: 's3',
      activeBugs: 2,
      bugsClosed: 1,
    });
  });
});

describe('computeBugBurndown', () => {
  const sprints = [
    { id: 's1', name: 'Sprint 1', startDate: new Date('2025-12-23'), endDate: new Date('2026-01-05') },
    { id: 's2', name: 'Sprint 2', startDate: new Date('2026-01-06'), endDate: new Date('2026-01-19') },
    { id: 's3', name: 'Sprint 3', startDate: new Date('2026-01-20'), endDate: new Date('2026-02-02') },
    { id: 's4', name: 'Sprint 4', startDate: new Date('2026-02-03'), endDate: new Date('2026-02-16') },
  ];

  it('backward-reconstructs open counts from current open + cumulative closed', () => {
    const result = computeBugBurndown({
      sprintsAsc: sprints,
      allBugs: [
        // 3 currently open bugs
        { state: 'New' },
        { state: 'Active' },
        { state: 'Active' },
        // 1 closed during s2
        { state: 'Resolved', changedDate: new Date('2026-01-10') },
        // 2 closed during s3
        { state: 'Closed', changedDate: new Date('2026-01-22') },
        { state: 'Resolved', changedDate: new Date('2026-01-28') },
        // 1 closed during s4
        { state: 'Closed', changedDate: new Date('2026-02-10') },
      ],
    });

    expect(result).toEqual([
      { sprintId: 's1', activeBugs: 7, bugsClosed: 0 },
      { sprintId: 's2', activeBugs: 6, bugsClosed: 1 },
      { sprintId: 's3', activeBugs: 4, bugsClosed: 2 },
      { sprintId: 's4', activeBugs: 3, bugsClosed: 1 },
    ]);
  });

  it('ignores resolved bugs whose changedDate is outside all sprint windows', () => {
    const result = computeBugBurndown({
      sprintsAsc: sprints,
      allBugs: [
        { state: 'Active' },
        // Closed before the trend window — doesn't count in any sprint
        { state: 'Resolved', changedDate: new Date('2025-11-01') },
        // Closed after the trend window
        { state: 'Closed', changedDate: new Date('2026-03-01') },
      ],
    });

    expect(result).toEqual([
      { sprintId: 's1', activeBugs: 1, bugsClosed: 0 },
      { sprintId: 's2', activeBugs: 1, bugsClosed: 0 },
      { sprintId: 's3', activeBugs: 1, bugsClosed: 0 },
      { sprintId: 's4', activeBugs: 1, bugsClosed: 0 },
    ]);
  });

  it('excludes bugs with null changedDate from closed counts', () => {
    const result = computeBugBurndown({
      sprintsAsc: sprints,
      allBugs: [
        { state: 'Resolved', changedDate: null },
        { state: 'Closed' },
        { state: 'Active' },
      ],
    });

    expect(result[3]).toMatchObject({ activeBugs: 1, bugsClosed: 0 });
  });

  it('excludes bugs in unrecognised states from both open and closed', () => {
    const result = computeBugBurndown({
      sprintsAsc: sprints,
      allBugs: [
        { state: 'Done' },
        { state: 'Removed' },
      ],
    });

    expect(result).toEqual([
      { sprintId: 's1', activeBugs: 0, bugsClosed: 0 },
      { sprintId: 's2', activeBugs: 0, bugsClosed: 0 },
      { sprintId: 's3', activeBugs: 0, bugsClosed: 0 },
      { sprintId: 's4', activeBugs: 0, bugsClosed: 0 },
    ]);
  });

  it('returns empty array when no sprints provided', () => {
    const result = computeBugBurndown({ sprintsAsc: [], allBugs: [{ state: 'Active' }] });
    expect(result).toEqual([]);
  });

  it('handles Testing state as resolved', () => {
    const result = computeBugBurndown({
      sprintsAsc: [sprints[0]],
      allBugs: [
        { state: 'Testing', changedDate: new Date('2025-12-28') },
        { state: 'Active' },
      ],
    });

    expect(result).toEqual([
      { sprintId: 's1', activeBugs: 1, bugsClosed: 1 },
    ]);
  });
});
