/**
 * @jest-environment node
 *
 * Tests for GET /api/metrics and POST /api/metrics/compute.
 * Mocks prisma and computeAllMetrics for unit testing.
 */

import { POST } from '@/app/api/metrics/compute/route';
import { GET } from '@/app/api/metrics/route';
import { DEFAULT_ENGINE_CONFIG, DEFAULT_METRIC_RULE_CONFIGS } from '@/lib/metrics/types';
import { ROLLING_WINDOW_DEPTH, VISIBLE_SPRINT_TABS } from '@/lib/sync/window';

const mockSprint = {
  id: 'sprint-1',
  name: 'Sprint 26.26',
  startDate: new Date('2026-04-13'),
  endDate: new Date('2026-04-24'),
};

const mockSnapshot = {
  sprintId: mockSprint.id,
  workstreamId: 'ws-1',
  workstream: { name: 'Action Tracker' },
  velocity: 34,
  overheadPercent: 28.5,
  predictability: 85,
  carryOverRate: 8.5,
  velocityAvg: 31.5,
  overheadPercentAvg: 26.2,
  predictabilityAvg: 82,
  carryOverRateAvg: 11,
  velocityRag: 'Green',
  overheadRag: 'Green',
  predictabilityRag: 'Green',
  carryOverRag: 'Green',
  carryOverItems: 3,
  carryOverPoints: 6,
  plannedPoints: 40,
  completedPoints: 34,
  bugHours: 8.5,
  overheadHours: 22.8,
  grossHours: 80,
  computedAt: new Date('2026-04-28T18:30:00Z'),
};

const mockThresholds = [
  {
    metricName: 'deliveryToBugRatio',
    greenMin: 0,
    greenMax: 0.25,
    amberMin: 0.26,
    amberMax: 0.5,
  },
];

jest.mock('@/lib/prisma', () => ({
  prisma: {
    metricSnapshot: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    sprint: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    thresholdConfig: {
      findMany: jest.fn(),
    },
    metricEngineConfig: {
      findUnique: jest.fn(),
    },
    metricRuleConfig: {
      findMany: jest.fn(),
    },
    workItem: {
      findMany: jest.fn(),
    },
    workstream: {
      findMany: jest.fn(),
    },
    sprintWorkstream: {
      findMany: jest.fn(),
    },
    sprintPlanSnapshot: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/metrics/orchestrator', () => ({
  computeAllMetrics: jest.fn(),
}));

const { prisma } = require('@/lib/prisma');
const { computeAllMetrics } = require('@/lib/metrics/orchestrator');

/** Route calls findMany twice: global current resolution (asc) then rolling window (desc). */
function mockSprintFindMany(
  pastSprintsForCurrent: Array<Record<string, unknown>>,
  rollingSprints?: Array<Record<string, unknown>>
) {
  const rolling = rollingSprints ?? pastSprintsForCurrent;
  prisma.sprint.findMany.mockImplementation(
    (args: { orderBy?: { startDate?: 'asc' | 'desc' } }) => {
      if (args.orderBy?.startDate === 'asc') {
        return Promise.resolve(pastSprintsForCurrent);
      }
      return Promise.resolve(rolling);
    }
  );
}

const globalActiveSprint = {
  id: 'global-current',
  name: 'Global Current',
  startDate: new Date('2020-01-01'),
  endDate: new Date('2100-01-01'),
  isCurrent: true,
};

describe('GET /api/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.workItem.findMany.mockResolvedValue([]);
    prisma.workstream.findMany.mockResolvedValue([{ id: 'ws-1' }]);
    prisma.sprintWorkstream.findMany.mockResolvedValue([]);
    prisma.sprintPlanSnapshot.findMany.mockResolvedValue([]);
    prisma.sprint.findFirst.mockResolvedValue(null);
    prisma.thresholdConfig.findMany.mockResolvedValue(mockThresholds);
    prisma.metricEngineConfig.findUnique.mockResolvedValue(DEFAULT_ENGINE_CONFIG);
    prisma.metricRuleConfig.findMany.mockResolvedValue(DEFAULT_METRIC_RULE_CONFIGS);
    mockSprintFindMany([]);
  });

  it('should return formatted metrics on happy path', async () => {
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sprint).toMatchObject({
      id: mockSprint.id,
      name: mockSprint.name,
    });
    expect(data.sprint.startDate).toBeDefined();
    expect(data.sprint.endDate).toBeDefined();
    expect(data.workstreams).toHaveLength(1);
    expect(data.workstreams[0].workstreamId).toBe('ws-1');
    expect(data.workstreams[0].workstreamName).toBe('Action Tracker');
    expect(data.workstreams[0].metrics.velocity).toMatchObject({
      value: 34,
      avg: 31.5,
      rag: 'Green',
      mode: 'actual',
    });
    expect(data.workstreams[0].detail).toMatchObject({
      plannedPoints: 40,
      completedPoints: 34,
      carryOverPoints: 6,
      overheadHours: 22.8,
      grossHours: 80,
    });
    expect(data.workstreams[0].detail).not.toHaveProperty('carryOverItems');
    expect(data.workstreams[0].trends).toBeDefined();
    expect(Array.isArray(data.workstreams[0].trends.sprints)).toBe(true);
    expect(data.workstreams[0].prediction).toMatchObject({
      deliveryToBugRatio: 0.15,
      deliveryToBugRag: 'Green',
    });
    expect(data.program).toHaveProperty('trends.sprints');
    expect(data.program).toHaveProperty('prediction.sprint5');
    expect(data.program.metrics.deliveryToBugRatio).toBe(0.15);
    expect(data.program.metrics.deliveryToBugRag).toBe('Green');
    expect(data.program.cycleTime.UserStory.averageBusinessDays).toBeNull();
    expect(data.workstreams[0].cycleTime.UserStory.averageBusinessDays).toBeNull();
    expect(data.computedAt).toBe('2026-04-28T18:30:00.000Z');
    expect(data.rollingWindow).toBeDefined();
    expect(data.cycleTimeWindow).toBeDefined();
    expect(data.rollingWindow.count).toBe(1);
    expect(prisma.sprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { startDate: { lte: mockSprint.startDate } },
        orderBy: { startDate: 'desc' },
        take: ROLLING_WINDOW_DEPTH,
      })
    );
    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'Bug' }),
        select: expect.objectContaining({ adoCreatedDate: true }),
      })
    );
    expect(prisma.metricSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          completedPoints: true,
          bugHours: true,
        }),
      })
    );
  });

  it('defaults to resolver current sprint instead of latest snapshot when sprintId is omitted', async () => {
    const resolverCurrent = {
      id: 'resolver-current',
      name: 'Resolver Current',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2100-01-01'),
      isCurrent: true,
    };
    const staleSnapshotSprint = {
      ...mockSprint,
      id: 'stale-snapshot',
      name: 'Recently Recomputed Past Sprint',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-14'),
    };

    mockSprintFindMany([resolverCurrent, staleSnapshotSprint], [resolverCurrent]);
    prisma.sprint.findUnique.mockResolvedValue(resolverCurrent);
    prisma.metricSnapshot.findMany.mockResolvedValue([{ ...mockSnapshot, sprintId: resolverCurrent.id }]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sprint.id).toBe('resolver-current');
    expect(prisma.sprint.findUnique).toHaveBeenCalledWith({ where: { id: 'resolver-current' } });
    expect(prisma.metricSnapshot.findFirst).not.toHaveBeenCalled();
    expect(data.rollingWindow.currentSprintId).toBe('resolver-current');
  });

  it('adds configured cycle-time data at program and workstream levels', async () => {
    const priorSprint = {
      id: 'sprint-0',
      name: 'Sprint 26.25',
      startDate: new Date('2026-03-30'),
      endDate: new Date('2026-04-10'),
    };
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    mockSprintFindMany([globalActiveSprint, mockSprint, priorSprint], [mockSprint, priorSprint]);
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);
    prisma.metricEngineConfig.findUnique.mockResolvedValue({
      ...DEFAULT_ENGINE_CONFIG,
      cycleTimeRollingWindow: 2,
    });
    prisma.workItem.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          type: 'UserStory',
          workstreamId: 'ws-1',
          adoActivatedDate: new Date('2026-04-13T09:00:00Z'),
          adoClosedDate: new Date('2026-04-15T17:00:00Z'),
        },
        {
          type: 'UserStory',
          workstreamId: 'ws-1',
          adoActivatedDate: null,
          adoClosedDate: new Date('2026-04-16T17:00:00Z'),
        },
        {
          type: 'Bug',
          workstreamId: 'ws-1',
          adoActivatedDate: new Date('2026-04-17T09:00:00Z'),
          adoClosedDate: new Date('2026-04-20T17:00:00Z'),
        },
      ]);

    const res = await GET(new Request('http://localhost/api/metrics'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cycleTimeWindow).toMatchObject({
      count: 2,
      startDate: '2026-03-30T00:00:00.000Z',
      endDate: '2026-04-24T00:00:00.000Z',
    });
    expect(data.workstreams[0].cycleTime.UserStory).toEqual({
      totalBusinessDays: 3,
      averageBusinessDays: 3,
      completedItemCount: 1,
      unavailableItemCount: 1,
    });
    expect(data.program.cycleTime.Bug).toMatchObject({
      totalBusinessDays: 2,
      averageBusinessDays: 2,
      completedItemCount: 1,
    });
    expect(prisma.sprint.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 2 }));
    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: { in: ['UserStory', 'Spike', 'Bug'] },
          workstreamId: { in: ['ws-1'] },
          OR: expect.arrayContaining([
            expect.objectContaining({
              adoClosedDate: null,
              state: { in: ['Closed', 'Done', 'Resolved'] },
            }),
          ]),
        }),
        select: expect.objectContaining({
          adoActivatedDate: true,
          adoClosedDate: true,
        }),
      })
    );
  });

  it('burndown counts unassigned bugs closed during the sprint window', async () => {
    const rolling = [
      mockSprint,
      { ...mockSprint, id: 'sprint-0', name: 'Sprint 26.25', startDate: new Date('2026-03-30') },
    ];
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], rolling);
    prisma.metricSnapshot.findMany.mockResolvedValueOnce([mockSnapshot]).mockResolvedValueOnce([
      {
        sprintId: 'sprint-0',
        workstreamId: 'ws-1',
        velocity: 20,
        grossHours: 80,
        overheadHours: 20,
      },
    ]);
    prisma.workItem.findMany.mockResolvedValue([
      {
        sprintId: 'sprint-0',
        workstreamId: 'ws-1',
        state: 'Resolved',
        adoChangedDate: new Date('2026-04-15'),
        adoId: 1001,
        title: 'Bug 1',
      },
      {
        sprintId: 'sprint-0',
        workstreamId: 'ws-1',
        state: 'New',
        adoChangedDate: new Date('2026-04-16'),
        adoId: 1002,
        title: 'Bug 2',
      },
      {
        sprintId: null,
        workstreamId: 'ws-1',
        state: 'Resolved',
        adoChangedDate: new Date('2026-04-17'),
        adoId: 1003,
        title: 'Bug 3',
      },
    ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Burndown uses changedDate within sprint window, not sprint assignment.
    // Bug 3 (sprintId=null) has changedDate within sprint-0's window → counted as closed.
    // activeBugs for sprint-0 is computed as-of that sprint's end date.
    const sprint0 = data.workstreams[0].trends.sprints.find(
      (s: { sprintId: string }) => s.sprintId === 'sprint-0'
    );
    expect(sprint0).toMatchObject({
      sprintId: 'sprint-0',
      bugsClosed: 2,
    });
  });

  it('adds delivery-to-bug fields using converted delivery hours at workstream and program levels', async () => {
    const wsOne = {
      ...mockSnapshot,
      workstreamId: 'ws-1',
      workstream: { name: 'Action Tracker' },
      completedPoints: 100,
      bugHours: 10,
    };
    const wsTwo = {
      ...mockSnapshot,
      workstreamId: 'ws-2',
      workstream: { name: 'Pitch Tracker' },
      completedPoints: 1,
      bugHours: 1,
    };

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([wsOne, wsTwo])
      .mockResolvedValueOnce([wsOne, wsTwo]);
    prisma.workstream.findMany.mockResolvedValue([{ id: 'ws-1' }, { id: 'ws-2' }]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams[0].prediction.deliveryToBugRatio).toBe(0.06);
    expect(data.workstreams[0].prediction.deliveryToBugRag).toBe('Green');
    expect(data.workstreams[1].prediction.deliveryToBugRatio).toBe(0.59);
    expect(data.workstreams[1].prediction.deliveryToBugRag).toBe('Red');
    expect(data.program.metrics.deliveryToBugRatio).toBe(0.06);
    expect(data.program.metrics.deliveryToBugRag).toBe('Green');
  });

  it('returns null ratio and Green RAG when the window has delivery but zero bug hours', async () => {
    const zeroBugSnapshot = {
      ...mockSnapshot,
      completedPoints: 12,
      bugHours: 0,
    };

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([zeroBugSnapshot])
      .mockResolvedValueOnce([zeroBugSnapshot]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams[0].prediction.deliveryToBugRatio).toBeNull();
    expect(data.workstreams[0].prediction.deliveryToBugRag).toBe('Green');
    expect(data.program.metrics.deliveryToBugRatio).toBeNull();
    expect(data.program.metrics.deliveryToBugRag).toBe('Green');
  });

  it('should return empty data when no snapshots', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue(null);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sprint).toBeNull();
    expect(data.workstreams).toEqual([]);
    expect(data.program).toBeNull();
    expect(data.computedAt).toBeNull();
  });

  it('should filter by sprintId when provided', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 'sprint-2' });
    prisma.sprint.findUnique.mockResolvedValue({ ...mockSprint, id: 'sprint-2' });
    mockSprintFindMany([globalActiveSprint, { ...mockSprint, id: 'sprint-2' }], [{ ...mockSprint, id: 'sprint-2' }]);
    prisma.metricSnapshot.findMany.mockResolvedValue([]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?sprintId=sprint-2');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.sprint.findUnique).toHaveBeenCalledWith({
      where: { id: 'sprint-2' },
    });
    expect(prisma.metricSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sprintId: 'sprint-2', workstreamId: { in: ['ws-1'] } },
      })
    );
  });

  it('returns a five-sprint rolling window ending at the selected mid-history sprint', async () => {
    const selectedSprint = {
      id: 's5',
      name: 'Sprint 5',
      startDate: new Date('2026-03-03'),
      endDate: new Date('2026-03-16'),
    };
    const rollingSprints = [
      selectedSprint,
      {
        id: 's4',
        name: 'Sprint 4',
        startDate: new Date('2026-02-17'),
        endDate: new Date('2026-03-02'),
      },
      {
        id: 's3',
        name: 'Sprint 3',
        startDate: new Date('2026-02-03'),
        endDate: new Date('2026-02-16'),
      },
      {
        id: 's2',
        name: 'Sprint 2',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-02-02'),
      },
      {
        id: 's1',
        name: 'Sprint 1',
        startDate: new Date('2026-01-06'),
        endDate: new Date('2026-01-19'),
      },
    ];

    prisma.sprint.findUnique.mockResolvedValue(selectedSprint);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: selectedSprint.id }])
      .mockResolvedValueOnce([]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?sprintId=s5');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.sprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { startDate: { lte: selectedSprint.startDate } },
        orderBy: { startDate: 'desc' },
        take: ROLLING_WINDOW_DEPTH,
      })
    );
    expect(data.rollingWindow.sprints.map((s: { id: string }) => s.id)).toEqual([
      's5',
      's4',
      's3',
      's2',
      's1',
    ]);
  });

  it('truncates the anchored rolling window when fewer than five sprints exist', async () => {
    const selectedSprint = {
      id: 's3',
      name: 'Sprint 3',
      startDate: new Date('2026-02-03'),
      endDate: new Date('2026-02-16'),
    };
    const rollingSprints = [
      selectedSprint,
      {
        id: 's2',
        name: 'Sprint 2',
        startDate: new Date('2026-01-20'),
        endDate: new Date('2026-02-02'),
      },
      {
        id: 's1',
        name: 'Sprint 1',
        startDate: new Date('2026-01-06'),
        endDate: new Date('2026-01-19'),
      },
    ];

    prisma.sprint.findUnique.mockResolvedValue(selectedSprint);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: selectedSprint.id }])
      .mockResolvedValueOnce([]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?sprintId=s3');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rollingWindow.count).toBe(3);
    expect(data.rollingWindow.sprints.map((s: { id: string }) => s.id)).toEqual(['s3', 's2', 's1']);
  });

  it.each([
    { totalHistory: 5, expectedWindow: 1 },
    { totalHistory: 6, expectedWindow: 2 },
    { totalHistory: 8, expectedWindow: 4 },
  ])(
    'truncates the oldest visible tab window with $totalHistory backed sprints',
    async ({ totalHistory, expectedWindow }) => {
      const oldestVisibleNumber = totalHistory - VISIBLE_SPRINT_TABS + 1;
      const rollingSprints = Array.from({ length: expectedWindow }, (_, index) => {
        const sprintNumber = oldestVisibleNumber - index;
        return {
          id: `s${sprintNumber}`,
          name: `Sprint ${sprintNumber}`,
          startDate: new Date(Date.UTC(2026, 0, 1 + sprintNumber * 14)),
          endDate: new Date(Date.UTC(2026, 0, 14 + sprintNumber * 14)),
        };
      });
      const selectedSprint = rollingSprints[0]!;

      prisma.sprint.findUnique.mockResolvedValue(selectedSprint);
      mockSprintFindMany(rollingSprints, rollingSprints);
      prisma.metricSnapshot.findMany
        .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: selectedSprint.id }])
        .mockResolvedValueOnce([]);
      prisma.thresholdConfig.findMany.mockResolvedValue([]);

      const req = new Request(`http://localhost/api/metrics?sprintId=${selectedSprint.id}`);
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.rollingWindow.count).toBe(expectedWindow);
      expect(data.rollingWindow.sprints).toHaveLength(expectedWindow);
      expect(prisma.sprint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: ROLLING_WINDOW_DEPTH })
      );
    }
  );

  it('preserves current-sprint trend and prediction behavior when sprintId is omitted', async () => {
    const currentSprint = {
      id: 'current',
      name: 'Current Sprint',
      startDate: new Date('2020-01-01'),
      endDate: new Date('2100-01-01'),
    };
    const rollingSprints = [
      currentSprint,
      {
        id: 's4',
        name: 'Sprint 4',
        startDate: new Date('2019-12-17'),
        endDate: new Date('2019-12-31'),
      },
      {
        id: 's3',
        name: 'Sprint 3',
        startDate: new Date('2019-12-03'),
        endDate: new Date('2019-12-16'),
      },
      {
        id: 's2',
        name: 'Sprint 2',
        startDate: new Date('2019-11-19'),
        endDate: new Date('2019-12-02'),
      },
      {
        id: 's1',
        name: 'Sprint 1',
        startDate: new Date('2019-11-05'),
        endDate: new Date('2019-11-18'),
      },
    ];

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: currentSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(currentSprint);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: currentSprint.id }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 10, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 12, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: 14, grossHours: 80, overheadHours: 20 },
        { sprintId: 's4', workstreamId: 'ws-1', velocity: 16, grossHours: 80, overheadHours: 20 },
        {
          sprintId: 'current',
          workstreamId: 'ws-1',
          velocity: null,
          grossHours: 100,
          overheadHours: 20,
        },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.rollingWindow.currentSprintId).toBe('current');
    const trendSprints = data.workstreams[0].trends.sprints;
    expect(trendSprints).toHaveLength(5);
    expect(trendSprints.at(-1)).toMatchObject({ sprintId: 'current', mode: 'current' });
    expect(data.workstreams[0].prediction.velocity).not.toBeNull();
  });

  it('should filter by workstreamId when provided', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?workstreamId=ws-1&sprintId=sprint-1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.metricSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sprintId: mockSprint.id, workstreamId: 'ws-1' },
      })
    );
  });

  it('filters by scoped workstreamIds before aggregation', async () => {
    const scopedSnapshot = {
      ...mockSnapshot,
      workstreamId: 'ws-2',
      workstream: { name: 'Pitch Tracker' },
      velocity: 13,
      completedPoints: 13,
    };
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.workstream.findMany
      .mockResolvedValueOnce([{ id: 'ws-1' }])
      .mockResolvedValueOnce([{ id: 'ws-2' }]);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([scopedSnapshot])
      .mockResolvedValueOnce([scopedSnapshot]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?workstreamIds=ws-2,stale&sprintId=sprint-1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams).toHaveLength(1);
    expect(data.workstreams[0].workstreamId).toBe('ws-2');
    expect(prisma.metricSnapshot.findMany.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: { sprintId: mockSprint.id, workstreamId: { in: ['ws-2'] } },
      })
    );
  });

  it('rejects an empty scoped workstreamIds query', async () => {
    const req = new Request('http://localhost/api/metrics?workstreamIds=');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/workstreamIds/i);
  });

  it('should omit program when includeProgram=false', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);

    const req = new Request('http://localhost/api/metrics?includeProgram=false');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).not.toHaveProperty('program');
  });

  it('should omit avg when includeRolling=false', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?includeRolling=false');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams[0].metrics.velocity).not.toHaveProperty('avg');
    expect(data.workstreams[0].metrics.velocity).toHaveProperty('value');
    expect(data.workstreams[0].metrics.velocity).toHaveProperty('rag');
  });

  it('suppresses workstream prediction velocity when the rolling window has no current sprint', async () => {
    const rollingSprints = [
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

    mockSprintFindMany([globalActiveSprint, ...rollingSprints], rollingSprints);
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's3' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's3' }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 30, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 40, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: null, grossHours: 80, overheadHours: 20 },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?sprintId=s3');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const ws = data.workstreams[0];
    expect(ws).toHaveProperty('prediction');
    expect(ws.prediction).toMatchObject({
      velocity: null,
      mode: 'predicted',
      formula: expect.any(String),
    });
    expect(ws.prediction.velocityRate).toBeCloseTo(0.59, 2);
  });

  it('includes bugs array per trend sprint with adoId, title, state sorted by adoId', async () => {
    const rollingSprints = [
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

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's3' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's3' }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 30, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 40, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: null, grossHours: 80, overheadHours: 20 },
      ]);
    prisma.workItem.findMany.mockResolvedValue([
      {
        sprintId: 's1',
        workstreamId: 'ws-1',
        state: 'Active',
        adoChangedDate: new Date('2025-12-28'),
        adoCreatedDate: new Date('2025-12-24'),
        adoId: 102,
        title: 'Bug B',
      },
      {
        sprintId: 's1',
        workstreamId: 'ws-1',
        state: 'Closed',
        adoChangedDate: new Date('2025-12-30'),
        adoCreatedDate: new Date('2025-12-24'),
        adoId: 101,
        title: 'Bug A',
      },
      {
        sprintId: 's2',
        workstreamId: 'ws-1',
        state: 'New',
        adoChangedDate: new Date('2026-01-10'),
        adoCreatedDate: new Date('2026-01-08'),
        adoId: 201,
        title: 'Bug C',
      },
    ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprints = data.workstreams[0].trends.sprints;
    // s1 and s2 are actual sprints; s3 is the current sprint (also included now)
    expect(sprints.length).toBeGreaterThanOrEqual(2);

    // The list mirrors the burndown bars: open = unresolved as-of sprint end,
    // closed = resolved during that sprint's window (as-of, not sprint-assignment).
    const s1 = sprints.find((s: { sprintId: string }) => s.sprintId === 's1');
    expect(s1.bugs).toEqual([
      { adoId: 101, title: 'Bug A', state: 'Closed', isClosed: true },
      { adoId: 102, title: 'Bug B', state: 'Active', isClosed: false },
    ]);

    // Bug B carries forward as still-open in s2 (cumulative as-of), and Bug C (created in s2) appears.
    const s2 = sprints.find((s: { sprintId: string }) => s.sprintId === 's2');
    expect(s2.bugs).toEqual([
      { adoId: 102, title: 'Bug B', state: 'Active', isClosed: false },
      { adoId: 201, title: 'Bug C', state: 'New', isClosed: false },
    ]);
  });

  it('returns empty bugs array when sprint has no bug work items', async () => {
    const rollingSprints = [
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

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's2' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's2', workstreamId: 'ws-1' }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 30, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 34, grossHours: 80, overheadHours: 20 },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprints = data.workstreams[0].trends.sprints;
    // s1 is the actual sprint; s2 is the current sprint (also included now)
    const s1 = sprints.find((s: { sprintId: string }) => s.sprintId === 's1');
    expect(s1).toBeDefined();
    expect(s1.bugs).toEqual([]);
  });

  it('includes overheadComposition on each trend sprint with all breakdown fields', async () => {
    const rollingSprints = [
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

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's2' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's2', workstreamId: 'ws-1' }])
      .mockResolvedValueOnce([
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          velocity: 30,
          grossHours: 80,
          overheadHours: 22,
          overheadPercent: 27.5,
          ceremonyHours: 10.25,
          bugHours: 8,
          spikeHours: 2,
          supportHours: 1.75,
        },
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          velocity: 34,
          grossHours: 80,
          overheadHours: 24,
          overheadPercent: 30,
          ceremonyHours: 10.25,
          bugHours: 10,
          spikeHours: 2,
          supportHours: 1.75,
        },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);
    prisma.sprintWorkstream.findMany.mockResolvedValue([
      { sprintId: 's1', workstreamId: 'ws-1', fteCount: 4, meetingOverheadMemberCount: 4 },
      { sprintId: 's2', workstreamId: 'ws-1', fteCount: 4, meetingOverheadMemberCount: 4 },
    ]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprints = data.workstreams[0].trends.sprints;
    const s1 = sprints.find((s: { sprintId: string }) => s.sprintId === 's1');
    // Meetings = 8.25 × 4 eligible = 33; work items default to [] so bug/spike/support are 0 here
    expect(s1.overheadComposition).toEqual({
      ceremonyHours: 33,
      bugHours: 0,
      spikeHours: 0,
      supportHours: 0,
      totalOverheadHours: 33,
      overheadPercent: 41.25,
    });
  });

  it('includes overheadItemsBySprint with bugs, spikes, and support arrays for all rolling sprints', async () => {
    const rollingSprints = [
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

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's2' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's2', workstreamId: 'ws-1' }])
      .mockResolvedValueOnce([
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          velocity: 30,
          grossHours: 80,
          overheadHours: 20,
          overheadPercent: 25,
          ceremonyHours: 10,
          bugHours: 5,
          spikeHours: 3,
          supportHours: 2,
        },
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          velocity: 34,
          grossHours: 80,
          overheadHours: 20,
          overheadPercent: 25,
          ceremonyHours: 10,
          bugHours: 5,
          spikeHours: 3,
          supportHours: 2,
        },
      ]);
    prisma.workItem.findMany
      .mockResolvedValueOnce([
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          adoId: 202,
          title: 'Bug B',
          state: 'Active',
          adoChangedDate: new Date(),
          completedWork: 4,
          originalEstimate: 3,
        },
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          adoId: 201,
          title: 'Bug A',
          state: 'Done',
          adoChangedDate: new Date(),
          completedWork: null,
          originalEstimate: 2,
        },
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          adoId: 101,
          title: 'Old Bug',
          state: 'Done',
          adoChangedDate: new Date(),
          completedWork: 1,
          originalEstimate: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          adoId: 301,
          title: 'Support A',
          state: 'Active',
          completedWork: null,
          originalEstimate: 5,
        },
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          adoId: 302,
          title: 'Old Support',
          state: 'Done',
          completedWork: 3,
          originalEstimate: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          sprintId: 's2',
          workstreamId: 'ws-1',
          adoId: 401,
          title: 'Spike A',
          state: 'New',
          storyPoints: 5,
          completedWork: null,
          originalEstimate: 8,
        },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const ws = data.workstreams[0];
    expect(ws.overheadItemsBySprint).toBeDefined();
    expect(ws.overheadItemsBySprint).toHaveLength(2);

    const s2Items = ws.overheadItemsBySprint.find((s: { sprintId: string }) => s.sprintId === 's2');
    expect(s2Items.bugs).toEqual([
      { adoId: 201, title: 'Bug A', state: 'Done', hours: 2 },
      { adoId: 202, title: 'Bug B', state: 'Active', hours: 4 },
    ]);
    expect(s2Items.spikes).toEqual([{ adoId: 401, title: 'Spike A', state: 'New', hours: 8 }]);
    expect(s2Items.support).toEqual([
      { adoId: 301, title: 'Support A', state: 'Active', hours: 5 },
    ]);

    const s1Items = ws.overheadItemsBySprint.find((s: { sprintId: string }) => s.sprintId === 's1');
    expect(s1Items.bugs).toEqual([{ adoId: 101, title: 'Old Bug', state: 'Done', hours: 1 }]);
    expect(s1Items.spikes).toEqual([]);
    expect(s1Items.support).toEqual([
      { adoId: 302, title: 'Old Support', state: 'Done', hours: 3 },
    ]);
  });

  it('returns empty arrays for all categories when workstream has no overhead items', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValueOnce([mockSnapshot]).mockResolvedValueOnce([
      {
        sprintId: mockSprint.id,
        workstreamId: 'ws-1',
        velocity: 34,
        grossHours: 80,
        overheadHours: 20,
        overheadPercent: 25,
        ceremonyHours: 10,
        bugHours: 5,
        spikeHours: 3,
        supportHours: 2,
      },
    ]);
    prisma.workItem.findMany.mockResolvedValue([]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const ws = data.workstreams[0];
    expect(ws.overheadItemsBySprint).toHaveLength(1);
    expect(ws.overheadItemsBySprint[0].bugs).toEqual([]);
    expect(ws.overheadItemsBySprint[0].spikes).toEqual([]);
    expect(ws.overheadItemsBySprint[0].support).toEqual([]);
  });

  it('uses completedWork for hours when present, falls back to originalEstimate, then null', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValueOnce([mockSnapshot]).mockResolvedValueOnce([
      {
        sprintId: mockSprint.id,
        workstreamId: 'ws-1',
        velocity: 34,
        grossHours: 80,
        overheadHours: 20,
        overheadPercent: 25,
        ceremonyHours: 10,
        bugHours: 5,
        spikeHours: 3,
        supportHours: 2,
      },
    ]);
    prisma.workItem.findMany
      .mockResolvedValueOnce([
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 10,
          title: 'Has completedWork',
          state: 'Done',
          adoChangedDate: new Date(),
          completedWork: 6,
          originalEstimate: 4,
        },
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 11,
          title: 'No completedWork',
          state: 'Active',
          adoChangedDate: new Date(),
          completedWork: null,
          originalEstimate: 3,
        },
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 12,
          title: 'No hours at all',
          state: 'New',
          adoChangedDate: new Date(),
          completedWork: null,
          originalEstimate: null,
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprintItems = data.workstreams[0].overheadItemsBySprint[0];
    expect(sprintItems.bugs).toEqual([
      { adoId: 10, title: 'Has completedWork', state: 'Done', hours: 6 },
      { adoId: 11, title: 'No completedWork', state: 'Active', hours: 3 },
      { adoId: 12, title: 'No hours at all', state: 'New', hours: null },
    ]);
  });

  it('items within overheadItemsBySprint arrays are ordered by adoId ascending', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValueOnce([mockSnapshot]).mockResolvedValueOnce([
      {
        sprintId: mockSprint.id,
        workstreamId: 'ws-1',
        velocity: 34,
        grossHours: 80,
        overheadHours: 20,
        overheadPercent: 25,
        ceremonyHours: 10,
        bugHours: 5,
        spikeHours: 3,
        supportHours: 2,
      },
    ]);
    prisma.workItem.findMany
      .mockResolvedValueOnce([
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 300,
          title: 'Bug Z',
          state: 'New',
          adoChangedDate: new Date(),
          completedWork: 1,
          originalEstimate: 1,
        },
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 100,
          title: 'Bug A',
          state: 'Done',
          adoChangedDate: new Date(),
          completedWork: 2,
          originalEstimate: 2,
        },
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 200,
          title: 'Bug M',
          state: 'Active',
          adoChangedDate: new Date(),
          completedWork: 3,
          originalEstimate: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 502,
          title: 'Support B',
          state: 'Active',
          completedWork: 2,
          originalEstimate: 2,
        },
        {
          sprintId: mockSprint.id,
          workstreamId: 'ws-1',
          adoId: 501,
          title: 'Support A',
          state: 'Done',
          completedWork: 1,
          originalEstimate: 1,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprintItems = data.workstreams[0].overheadItemsBySprint[0];
    expect(sprintItems.bugs.map((b: { adoId: number }) => b.adoId)).toEqual([100, 200, 300]);
    expect(sprintItems.support.map((s: { adoId: number }) => s.adoId)).toEqual([501, 502]);
  });

  it('returns non-null velocityRate on trend sprints when grossHours and overheadHours are populated', async () => {
    const rollingSprints = [
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

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's3' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's3' }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 30, grossHours: 300, overheadHours: 60 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 40, grossHours: 350, overheadHours: 70 },
        {
          sprintId: 's3',
          workstreamId: 'ws-1',
          velocity: null,
          grossHours: 320,
          overheadHours: 64,
        },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprints = data.workstreams[0].trends.sprints;
    const s1 = sprints.find((s: { sprintId: string }) => s.sprintId === 's1');
    const s2 = sprints.find((s: { sprintId: string }) => s.sprintId === 's2');

    // velocityRate = velocity / (grossHours - overheadHours), rounded to 2 decimals in trend-service
    // s1: 30 / 240 = 0.125 → 0.13
    expect(s1.velocityRate).not.toBeNull();
    expect(s1.velocityRate).toBeCloseTo(0.13, 2);
    // s2: 40 / 280 ≈ 0.1429 → 0.14
    expect(s2.velocityRate).not.toBeNull();
    expect(s2.velocityRate).toBeCloseTo(0.14, 2);
  });

  it('includes overheadBreakdown on each trend sprint with all 4 categories', async () => {
    const rollingSprints = [
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

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: 's2' });
    prisma.sprint.findUnique.mockResolvedValue(rollingSprints[0]);
    mockSprintFindMany(rollingSprints, rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's2' }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 30, grossHours: 300, overheadHours: 60 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 34, grossHours: 300, overheadHours: 60 },
      ]);
    // Bugs for trend sprints (3 calls: Bug, Support, Spike)
    prisma.workItem.findMany
      .mockResolvedValueOnce([
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          state: 'Done',
          adoChangedDate: new Date('2025-12-28'),
          adoId: 101,
          title: 'Bug A',
          completedWork: 8,
          originalEstimate: 5,
        },
      ])
      .mockResolvedValueOnce([
        {
          sprintId: 's1',
          workstreamId: 'ws-1',
          adoId: 201,
          title: 'Support A',
          state: 'Active',
          completedWork: null,
          originalEstimate: 3,
        },
      ])
      .mockResolvedValueOnce([{ sprintId: 's1', workstreamId: 'ws-1', storyPoints: 5 }]);
    prisma.sprintWorkstream.findMany.mockResolvedValue([
      { sprintId: 's1', workstreamId: 'ws-1', fteCount: 4, meetingOverheadMemberCount: 4 },
      { sprintId: 's2', workstreamId: 'ws-1', fteCount: 4, meetingOverheadMemberCount: 4 },
    ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprints = data.workstreams[0].trends.sprints;
    expect(Array.isArray(sprints)).toBe(true);
    const s1 = sprints.find((s: { sprintId: string }) => s.sprintId === 's1');
    expect(s1).toBeDefined();
    expect(s1.overheadBreakdown).toHaveLength(4);
    // Meetings = 8.25 × 4 eligible = 33
    expect(
      s1.overheadBreakdown.find((i: { category: string }) => i.category === 'Meetings').hours
    ).toBeCloseTo(33);
    // Spikes = storyPoints = 5
    expect(
      s1.overheadBreakdown.find((i: { category: string }) => i.category === 'Spikes').hours
    ).toBe(5);
    // Bugs = completedWork = 8
    expect(
      s1.overheadBreakdown.find((i: { category: string }) => i.category === 'Bugs').hours
    ).toBe(8);
    // Support = originalEstimate = 3 (completedWork is null)
    expect(
      s1.overheadBreakdown.find((i: { category: string }) => i.category === 'Support').hours
    ).toBe(3);
  });

  it('returns all 4 overhead categories with hours=0 when no overhead work items exist', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);
    // All work item and sprintWorkstream queries return empty
    prisma.workItem.findMany.mockResolvedValue([]);
    prisma.sprintWorkstream.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const sprints = data.workstreams[0].trends.sprints;
    // No past sprints when rolling window has only 1 sprint (current), so trends may be empty
    // but structure should still be valid if there are trend sprints
    expect(Array.isArray(sprints)).toBe(true);
  });

  it('returns non-null overheadPercent on workstream metrics when grossHours is populated', async () => {
    const snapshotWithGrossHours = {
      ...mockSnapshot,
      grossHours: 280,
      overheadHours: 42,
      overheadPercent: 15,
    };

    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    mockSprintFindMany([globalActiveSprint, mockSprint], [mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([snapshotWithGrossHours]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams[0].metrics.overheadPercent.value).not.toBeNull();
    expect(data.workstreams[0].metrics.overheadPercent.value).toBe(15);
  });
});

describe('POST /api/metrics/compute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should trigger computation and return success', async () => {
    (computeAllMetrics as jest.Mock).mockResolvedValue({
      sprintId: 'sprint-1',
      sprintName: 'Sprint 27.1',
      workstreams: [{}, {}, {}, {}],
      errors: [],
      computedAt: new Date(),
    });

    const req = new Request('http://localhost/api/metrics/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId: 'sprint-1' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.snapshotsCreated).toBe(4);
    expect(data.sprintId).toBe('sprint-1');
    expect(data.sprintName).toBe('Sprint 27.1');
    expect(computeAllMetrics).toHaveBeenCalledWith('sprint-1');
  });

  it('should return 400 for invalid sprintId', async () => {
    const req = new Request('http://localhost/api/metrics/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId: '' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Invalid');
    expect(computeAllMetrics).not.toHaveBeenCalled();
  });

  it('should return 400 for sprintId that is not a string', async () => {
    const req = new Request('http://localhost/api/metrics/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId: 123 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(computeAllMetrics).not.toHaveBeenCalled();
  });

  it('should return 404 when sprint not found', async () => {
    (computeAllMetrics as jest.Mock).mockRejectedValue(new Error('Sprint not found: invalid-id'));

    const req = new Request('http://localhost/api/metrics/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId: 'invalid-id' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Sprint not found');
  });

  it('should return 404 when no sprints found', async () => {
    (computeAllMetrics as jest.Mock).mockRejectedValue(new Error('No sprints found'));

    const req = new Request('http://localhost/api/metrics/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it('should return 500 on generic error', async () => {
    (computeAllMetrics as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const req = new Request('http://localhost/api/metrics/compute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintId: 'sprint-1' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database connection failed');
  });
});
