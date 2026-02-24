import {
  buildTrendSeries,
  calculateNetCapacityHours,
  calculateVelocityRate,
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
          sprintId: 's1',
          workstreamId: 'ws-1',
          state: 'Done',
          changedDate: new Date('2026-01-02'),
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
          state: 'Done',
          changedDate: new Date('2026-02-01'),
        },
      ],
      workstreamId: 'ws-1',
    });

    expect(result.sprints).toHaveLength(4);
    expect(result.sprints[0]).toMatchObject({
      sprintId: 's1',
      velocity: 10,
      velocityRate: 10 / 60,
      activeBugs: 1,
      bugsClosed: 1,
      mode: 'actual',
    });
    expect(result.sprints[3]).toMatchObject({
      sprintId: 's4',
      activeBugs: 1,
      bugsClosed: 0,
    });

    // Avg velocity rate = ((10/60)+(12/60)+(8/60)+(10/60))/4 = 1/6
    // Current net capacity = 100 - 20 = 80
    // Predicted velocity = 80/6 = 13.333...
    expect(result.prediction.mode).toBe('predicted');
    expect(result.prediction.velocity).toBeCloseTo(13.333, 3);
    expect(result.prediction.formula).toContain('average velocity rate');
  });

  it('counts closed bugs only when resolved within the sprint window', () => {
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
        // s1 window is 2025-12-23 .. 2026-01-05
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          state: 'Done',
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
      activeBugs: 1,
      bugsClosed: 1,
    });
  });
});
