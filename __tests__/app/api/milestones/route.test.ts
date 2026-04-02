/**
 * @jest-environment node
 *
 * Tests for GET /api/milestones and POST /api/milestones.
 * Mocks prisma for unit testing.
 *
 * GET lists tag-derived milestones from WorkItems only (no `milestone.findMany`).
 */

import { GET, POST } from '@/app/api/milestones/route';

const mockWorkstream = { id: 'ws-1', name: 'Platform', adoAreaPath: 'Area\\Platform' };

const mockMilestoneNoFeature = {
  id: 'ms-1',
  title: 'Q1 Release',
  workstreamId: 'ws-1',
  targetMonth: new Date('2026-03-01'),
  status: 'NotStarted' as const,
  adoFeatureId: null,
  notes: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  workstream: mockWorkstream,
};

/** Default qualifying Feature row for GET (ADO tags include ADP-MAR). */
function createMockFeature(overrides: Record<string, unknown> = {}) {
  return {
    adoId: 12345,
    title: 'Test Feature',
    tags: 'ADP-MAR',
    workstreamId: 'ws-1',
    workstream: mockWorkstream,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    type: 'Feature' as const,
    ...overrides,
  };
}

// Alias used by POST tests
const mockMilestone = mockMilestoneNoFeature;

const mockChildStory = {
  parentAdoId: 12345,
  state: 'Done',
  storyPoints: 8,
  tags: 'ADP-MAR',
  workstreamId: 'ws-1',
  workstream: { id: 'ws-1', name: 'Platform' },
  sprint: {
    id: 'sp-1',
    name: 'Sprint 1',
    startDate: new Date('2026-01-06T00:00:00.000Z'),
  },
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    milestone: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workItem: {
      findMany: jest.fn(),
    },
    workstream: {
      findUnique: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

/** GET runs Promise.all: Features + UserStories. */
function stubWorkItemQueries(userStories: unknown[], features: unknown[] = []) {
  prisma.workItem.findMany.mockImplementation((args: { where?: { type?: string } }) => {
    if (args?.where?.type === 'Feature') {
      return Promise.resolve(features);
    }
    return Promise.resolve(userStories);
  });
}

describe('GET /api/milestones', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stubWorkItemQueries([]);
  });

  describe('response shape', () => {
    it('returns a wrapper object with milestones array and programRollup', async () => {
      stubWorkItemQueries([], [createMockFeature()]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('milestones');
      expect(data).toHaveProperty('programRollup');
      expect(Array.isArray(data.milestones)).toBe(true);
    });

    it('includes base milestone fields from tag-derived Feature row', async () => {
      stubWorkItemQueries([], [createMockFeature({ title: 'Roadmap A' })]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(data.milestones[0]).toMatchObject({
        id: 'ado-feature-12345',
        title: 'Roadmap A',
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01T00:00:00.000Z',
        status: 'NotStarted',
        adoFeatureId: 12345,
        notes: null,
      });
      expect(data.milestones[0].workstream).toEqual({ id: 'ws-1', name: 'Platform' });
    });

    it('loads Features and UserStories in parallel (two workItem.findMany calls)', async () => {
      stubWorkItemQueries([], []);

      const req = new Request('http://localhost/api/milestones');
      await GET(req);

      expect(prisma.workItem.findMany).toHaveBeenCalledTimes(2);
      const calls = prisma.workItem.findMany.mock.calls.map((c: unknown[]) => c[0]);
      expect(calls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ where: { type: 'Feature' } }),
          expect.objectContaining({
            where: { type: 'UserStory', parentAdoId: { not: null } },
          }),
        ])
      );
      expect(prisma.milestone.findMany).not.toHaveBeenCalled();
    });

    it('returns empty milestones array and programRollup when no qualifying Features exist', async () => {
      stubWorkItemQueries([], []);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.milestones).toEqual([]);
      expect(data.programRollup).toMatchObject({
        currentMonthTotalSP: 0,
        currentMonthCompletedSP: 0,
        quarterlyMilestones: { total: 0, complete: 0, inProgress: 0, notStarted: 0 },
      });
    });
  });

  describe('progress fields', () => {
    it('tag-derived milestone with no rollup stories has zero progress', async () => {
      stubWorkItemQueries([], [createMockFeature({ tags: '25ADP' })]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      const m = data.milestones[0];
      expect(m.completedPoints).toBe(0);
      expect(m.totalPoints).toBe(0);
      expect(m.percentComplete).toBeNull();
      expect(m.burnupData).toEqual([]);
    });

    it('milestone with linked feature and done child story has correct completedPoints, totalPoints, percentComplete', async () => {
      stubWorkItemQueries([mockChildStory], [createMockFeature()]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      const m = data.milestones[0];
      expect(m.completedPoints).toBe(8);
      expect(m.totalPoints).toBe(8);
      expect(m.percentComplete).toBe(100);
    });

    it('milestone with partial progress returns correct percentComplete', async () => {
      stubWorkItemQueries(
        [
          { ...mockChildStory, state: 'Done', storyPoints: 5 },
          { ...mockChildStory, state: 'Active', storyPoints: 5 },
        ],
        [createMockFeature()]
      );

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      const m = data.milestones[0];
      expect(m.completedPoints).toBe(5);
      expect(m.totalPoints).toBe(10);
      expect(m.percentComplete).toBe(50);
    });

    it('burnupData array is present and has correct structure', async () => {
      stubWorkItemQueries([mockChildStory], [createMockFeature()]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      const burnupData = data.milestones[0].burnupData;
      expect(Array.isArray(burnupData)).toBe(true);
      expect(burnupData).toHaveLength(1);
      expect(burnupData[0]).toMatchObject({
        sprintName: 'Sprint 1',
        sprintId: 'sp-1',
        cumulativeCompletedSP: 8,
        totalSP: 8,
      });
    });

    it('always queries workItem for Features and UserStories', async () => {
      stubWorkItemQueries([], []);

      const req = new Request('http://localhost/api/milestones');
      await GET(req);

      expect(prisma.workItem.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('programRollup', () => {
    it('programRollup has required fields', async () => {
      stubWorkItemQueries([], []);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(data.programRollup).toMatchObject({
        currentMonth: expect.any(String),
        currentMonthTotalSP: expect.any(Number),
        currentMonthCompletedSP: expect.any(Number),
        quarterlyMilestones: {
          total: expect.any(Number),
          complete: expect.any(Number),
          inProgress: expect.any(Number),
          notStarted: expect.any(Number),
        },
      });
    });
  });

  describe('workstreamId filtering', () => {
    it('does not pass workstreamId to prisma (filter applied in memory)', async () => {
      stubWorkItemQueries([], [createMockFeature()]);

      const req = new Request('http://localhost/api/milestones?workstreamId=ws-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('milestones');
      expect(prisma.workItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'Feature' },
        })
      );
    });

    it('returns milestones scoped to the filtered workstream', async () => {
      stubWorkItemQueries([mockChildStory], [createMockFeature()]);

      const req = new Request('http://localhost/api/milestones?workstreamId=ws-1');
      const res = await GET(req);
      const data = await res.json();

      expect(data.milestones).toHaveLength(1);
      expect(data.milestones[0].workstreamId).toBe('ws-1');
    });

    it('excludes Features assigned to a different workstream when filtering', async () => {
      stubWorkItemQueries(
        [{ ...mockChildStory, workstreamId: 'ws-1', workstream: { id: 'ws-1', name: 'Platform' } }],
        [createMockFeature({ workstreamId: 'ws-2', workstream: { id: 'ws-2', name: 'Other' } })]
      );

      const req = new Request('http://localhost/api/milestones?workstreamId=ws-1');
      const res = await GET(req);
      const data = await res.json();

      expect(data.milestones).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('returns 500 when prisma throws', async () => {
      prisma.workItem.findMany.mockRejectedValue(new Error('DB connection failed'));

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('DB connection failed');
    });
  });
});

describe('ADP-MON tag filter', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stubWorkItemQueries([], [createMockFeature()]);
  });

  it('AC1: only ADP-MON-tagged stories contribute to progress when mixed', async () => {
    stubWorkItemQueries(
      [
        { ...mockChildStory, state: 'Done', storyPoints: 8, tags: 'ADP-MAR' },
        { ...mockChildStory, state: 'Done', storyPoints: 5, tags: null },
        { ...mockChildStory, state: 'Done', storyPoints: 3, tags: 'Sprint Planning' },
      ],
      [createMockFeature()]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(8);
    expect(m.completedPoints).toBe(8);
    expect(m.percentComplete).toBe(100);
  });

  it('AC2: Q#-PLAN stories contribute to progress (explicit quarter plan tags)', async () => {
    stubWorkItemQueries(
      [
        { ...mockChildStory, state: 'Done', storyPoints: 5, tags: 'Sprint Planning' },
        {
          ...mockChildStory,
          state: 'Active',
          storyPoints: 3,
          tags: 'Q4 PLAN',
          workstreamId: null,
          workstream: null,
        },
      ],
      [createMockFeature({ tags: null })]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(3);
    expect(m.completedPoints).toBe(0);
    expect(m.percentComplete).toBe(0);
    expect(m.adpMonTagLabel).toBe('Q4-PLAN');
    expect(m.workstreamBreakdown).toEqual([
      {
        workstreamId: '__unassigned__',
        workstreamName: 'Area not mapped to workstream',
        totalStories: 1,
        inProgressCount: 1,
        inProgressPercent: 100,
        completedCount: 0,
        completedPercent: 0,
      },
    ]);
  });

  it('AC3: stories with tags: null are excluded', async () => {
    stubWorkItemQueries(
      [
        { ...mockChildStory, state: 'Done', storyPoints: 13, tags: null },
        { ...mockChildStory, state: 'Done', storyPoints: 5, tags: 'ADP-MAR' },
      ],
      [createMockFeature()]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(5);
    expect(m.completedPoints).toBe(5);
  });

  it('AC4: ADP-MON tag match is case-insensitive', async () => {
    stubWorkItemQueries(
      [
        { ...mockChildStory, state: 'Done', storyPoints: 6, tags: 'adp-mar' },
        { ...mockChildStory, state: 'Done', storyPoints: 4, tags: 'ADP-mar' },
      ],
      [createMockFeature()]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(10);
    expect(m.completedPoints).toBe(10);
  });

  it('AC1 (workstreamBreakdown): only ADP-MON-tagged stories appear in breakdown', async () => {
    stubWorkItemQueries(
      [
        {
          parentAdoId: 12345,
          state: 'Done',
          storyPoints: 8,
          tags: 'ADP-MAR',
          workstreamId: 'ws-1',
          workstream: { id: 'ws-1', name: 'Platform' },
          sprint: null,
        },
        {
          parentAdoId: 12345,
          state: 'Done',
          storyPoints: 5,
          tags: null,
          workstreamId: 'ws-2',
          workstream: { id: 'ws-2', name: 'Quality' },
          sprint: null,
        },
      ],
      [createMockFeature()]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const breakdown = data.milestones[0].workstreamBreakdown;
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].workstreamId).toBe('ws-1');
    expect(breakdown[0].totalStories).toBe(1);
  });

  it('ADP-tagged stories with no workstream mapping still get a breakdown row (quarterly charts)', async () => {
    stubWorkItemQueries(
      [
        {
          parentAdoId: 12345,
          state: 'Done',
          storyPoints: 5,
          tags: 'ADP - MAR',
          workstreamId: null,
          workstream: null,
          sprint: null,
        },
      ],
      [createMockFeature()]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(5);
    const breakdown = m.workstreamBreakdown;
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].workstreamId).toBe('__unassigned__');
    expect(breakdown[0].workstreamName).toBe('Area not mapped to workstream');
    expect(breakdown[0].totalStories).toBe(1);
  });
});

describe('ADP strict story tags (no Feature fallback)', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-15T12:00:00.000Z'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stubWorkItemQueries([], [createMockFeature()]);
  });

  it('excludes untagged children even when parent Feature has ADP-MAR', async () => {
    stubWorkItemQueries(
      [
        {
          ...mockChildStory,
          state: 'Done',
          storyPoints: 5,
          tags: null,
          workstreamId: 'ws-1',
          workstream: { id: 'ws-1', name: 'Platform' },
        },
        {
          ...mockChildStory,
          state: 'Active',
          storyPoints: 3,
          tags: 'Sprint Planning',
          workstreamId: 'ws-1',
          workstream: { id: 'ws-1', name: 'Platform' },
        },
      ],
      [createMockFeature({ tags: 'ADP-MAR' })]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(0);
    expect(m.workstreamBreakdown).toEqual([]);
  });

  it('does not count children when Feature has 25ADP only and stories are untagged', async () => {
    stubWorkItemQueries(
      [{ ...mockChildStory, state: 'Done', storyPoints: 5, tags: null }],
      [createMockFeature({ tags: '25ADP' })]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(0);
    expect(m.completedPoints).toBe(0);
  });

  it('counts ADO-style spaced tag ADP - JAN same as ADP-JAN', async () => {
    stubWorkItemQueries(
      [
        {
          ...mockChildStory,
          state: 'Done',
          storyPoints: 8,
          tags: 'ADP - JAN; KPI Group 1',
          workstreamId: 'ws-1',
          workstream: { id: 'ws-1', name: 'Platform' },
        },
        { ...mockChildStory, state: 'Done', storyPoints: 99, tags: null },
      ],
      [createMockFeature({ tags: '25ADP' })]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(8);
    expect(m.completedPoints).toBe(8);
    expect(m.adpMonTagLabel).toBe('ADP-JAN');
  });

  it('only ADP-MON-tagged children count when mixed with untagged', async () => {
    stubWorkItemQueries(
      [
        { ...mockChildStory, state: 'Done', storyPoints: 8, tags: 'ADP-MAR' },
        { ...mockChildStory, state: 'Done', storyPoints: 99, tags: null },
      ],
      [createMockFeature({ tags: 'ADP-MAR' })]
    );

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(8);
    expect(m.completedPoints).toBe(8);
  });
});

describe('POST /api/milestones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create milestone with valid body and return 201', async () => {
    prisma.workstream.findUnique.mockResolvedValue(mockWorkstream);
    prisma.milestone.create.mockResolvedValue({
      ...mockMilestone,
      workstream: mockWorkstream,
    });

    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data).toMatchObject({
      id: 'ms-1',
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      status: 'NotStarted',
    });
    expect(data.workstream).toEqual({ id: 'ws-1', name: 'Platform' });
    expect(prisma.milestone.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Q1 Release',
          workstreamId: 'ws-1',
          status: 'NotStarted',
        }),
      })
    );
  });

  it('should return 400 for missing title', async () => {
    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.errors).toEqual(expect.arrayContaining([expect.stringContaining('title')]));
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 400 for missing workstreamId', async () => {
    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        targetMonth: '2026-03-01',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.errors).toBeDefined();
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid workstreamId (non-existent)', async () => {
    prisma.workstream.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        workstreamId: 'ws-nonexistent',
        targetMonth: '2026-03-01',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toEqual(expect.arrayContaining([expect.stringContaining('workstream')]));
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid status', async () => {
    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01',
        status: 'InvalidStatus',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toBeDefined();
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 400 for missing targetMonth', async () => {
    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        workstreamId: 'ws-1',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toEqual(expect.arrayContaining([expect.stringContaining('targetMonth')]));
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 400 for malformed targetMonth', async () => {
    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        workstreamId: 'ws-1',
        targetMonth: 'not-a-date',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toEqual(expect.arrayContaining([expect.stringContaining('targetMonth')]));
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 400 for empty title', async () => {
    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '   ',
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01',
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(prisma.milestone.create).not.toHaveBeenCalled();
  });

  it('should return 500 on unexpected error', async () => {
    prisma.workstream.findUnique.mockResolvedValue(mockWorkstream);
    prisma.milestone.create.mockRejectedValue(new Error('Database error'));

    const req = new Request('http://localhost/api/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release',
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Database error');
  });
});
