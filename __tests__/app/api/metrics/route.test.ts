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
  workstream: { name: 'Streams' },
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
    },
    thresholdConfig: {
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
  });

  it('should return formatted metrics on happy path', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({
      sprintId: mockSprint.id,
    });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
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
    expect(data.workstreams[0].workstreamName).toBe('Streams');
    expect(data.workstreams[0].metrics.velocity).toMatchObject({
      value: 34,
      avg: 31.5,
      rag: 'Green',
    });
    expect(data.workstreams[0].detail).toMatchObject({
      plannedPoints: 40,
      completedPoints: 34,
      carryOverItems: 3,
      carryOverPoints: 6,
      overheadHours: 22.8,
      grossHours: 80,
    });
    expect(data.computedAt).toBe('2026-02-11T18:30:00.000Z');
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
        where: { sprintId: 'sprint-2' },
      })
    );
  });

  it('should filter by workstreamId when provided', async () => {
    prisma.metricSnapshot.findFirst.mockResolvedValue({ sprintId: mockSprint.id });
    prisma.sprint.findUnique.mockResolvedValue(mockSprint);
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
