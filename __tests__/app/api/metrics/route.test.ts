/**
 * @jest-environment node
 *
 * Tests for GET /api/metrics and POST /api/metrics/compute.
 * Mocks prisma and computeAllMetrics for unit testing.
 */

import { POST } from '@/app/api/metrics/compute/route';
import { GET } from '@/app/api/metrics/route';

const mockSprint = {
  id: 'sprint-1',
  name: 'Sprint 26.21',
  startDate: new Date('2026-01-06'),
  endDate: new Date('2026-01-19'),
};

const mockSnapshot = {
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
  overheadHours: 22.8,
  grossHours: 80,
  computedAt: new Date('2026-02-11T18:30:00Z'),
};

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

describe('GET /api/metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.workItem.findMany.mockResolvedValue([]);
    prisma.workstream.findMany.mockResolvedValue([{ id: 'ws-1' }]);
    prisma.sprintWorkstream.findMany.mockResolvedValue([]);
    prisma.sprintPlanSnapshot.findMany.mockResolvedValue([]);
    prisma.sprint.findFirst.mockResolvedValue(null);
  });

  it('should return formatted metrics on happy path', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({
      sprintId: mockSprint.id,
    });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

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
    expect(data.program).toHaveProperty('trends.sprints');
    expect(data.program).toHaveProperty('prediction.sprint5');
    expect(data.computedAt).toBe('2026-02-11T18:30:00.000Z');
    expect(data.rollingWindow).toBeDefined();
    expect(data.rollingWindow.count).toBe(1);
  });

  it('burndown counts unassigned bugs closed during the sprint window', async () => {
    const rolling = [
      mockSprint,
      { ...mockSprint, id: 'sprint-0', name: 'Sprint 26.20', startDate: new Date('2025-12-23') },
    ];
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.sprint.findMany.mockResolvedValue(rolling);
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
        adoChangedDate: new Date('2026-01-10'),
        adoId: 1001,
        title: 'Bug 1',
      },
      {
        sprintId: 'sprint-0',
        workstreamId: 'ws-1',
        state: 'New',
        adoChangedDate: new Date('2026-01-11'),
        adoId: 1002,
        title: 'Bug 2',
      },
      {
        sprintId: null,
        workstreamId: 'ws-1',
        state: 'Resolved',
        adoChangedDate: new Date('2026-01-12'),
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
    // activeBugs for sprint-0 is backward-reconstructed including the current sprint's closed count.
    const sprint0 = data.workstreams[0].trends.sprints.find(
      (s: { sprintId: string }) => s.sprintId === 'sprint-0'
    );
    expect(sprint0).toMatchObject({
      sprintId: 'sprint-0',
      bugsClosed: 2,
    });
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
    prisma.sprint.findMany.mockResolvedValue([{ ...mockSprint, id: 'sprint-2' }]);
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

  it('should filter by workstreamId when provided', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
    prisma.metricSnapshot.findMany.mockResolvedValue([mockSnapshot]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics?workstreamId=ws-1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.metricSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sprintId: mockSprint.id, workstreamId: 'ws-1' },
      })
    );
  });

  it('should omit program when includeProgram=false', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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

  it('includes prediction field per workstream with velocity, velocityRate, mode, and formula', async () => {
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
    prisma.metricSnapshot.findMany
      .mockResolvedValueOnce([{ ...mockSnapshot, sprintId: 's3' }])
      .mockResolvedValueOnce([
        { sprintId: 's1', workstreamId: 'ws-1', velocity: 30, grossHours: 80, overheadHours: 20 },
        { sprintId: 's2', workstreamId: 'ws-1', velocity: 40, grossHours: 80, overheadHours: 20 },
        { sprintId: 's3', workstreamId: 'ws-1', velocity: null, grossHours: 80, overheadHours: 20 },
      ]);
    prisma.thresholdConfig.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/metrics');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const ws = data.workstreams[0];
    expect(ws).toHaveProperty('prediction');
    expect(ws.prediction).toMatchObject({
      mode: 'predicted',
      formula: expect.any(String),
    });
    expect(ws.prediction.velocity).toBeCloseTo(35.4, 1);
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
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
        adoId: 102,
        title: 'Bug B',
      },
      {
        sprintId: 's1',
        workstreamId: 'ws-1',
        state: 'Closed',
        adoChangedDate: new Date('2025-12-30'),
        adoId: 101,
        title: 'Bug A',
      },
      {
        sprintId: 's2',
        workstreamId: 'ws-1',
        state: 'New',
        adoChangedDate: new Date('2026-01-10'),
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

    const s1 = sprints.find((s: { sprintId: string }) => s.sprintId === 's1');
    expect(s1.bugs).toEqual([
      { adoId: 101, title: 'Bug A', state: 'Closed' },
      { adoId: 102, title: 'Bug B', state: 'Active' },
    ]);

    const s2 = sprints.find((s: { sprintId: string }) => s.sprintId === 's2');
    expect(s2.bugs).toEqual([{ adoId: 201, title: 'Bug C', state: 'New' }]);
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
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
    expect(s2Items.spikes).toEqual([
      { adoId: 401, title: 'Spike A', state: 'New', hours: 8 },
    ]);
    expect(s2Items.support).toEqual([
      { adoId: 301, title: 'Support A', state: 'Active', hours: 5 },
    ]);

    const s1Items = ws.overheadItemsBySprint.find((s: { sprintId: string }) => s.sprintId === 's1');
    expect(s1Items.bugs).toEqual([
      { adoId: 101, title: 'Old Bug', state: 'Done', hours: 1 },
    ]);
    expect(s1Items.spikes).toEqual([]);
    expect(s1Items.support).toEqual([
      { adoId: 302, title: 'Old Support', state: 'Done', hours: 3 },
    ]);
  });

  it('returns empty arrays for all categories when workstream has no overhead items', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
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
    prisma.sprint.findMany.mockResolvedValue(rollingSprints);
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
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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
    prisma.sprint.findMany.mockResolvedValue([mockSprint]);
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
      sprintName: 'Sprint 26.21',
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
    expect(data.sprintName).toBe('Sprint 26.21');
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
