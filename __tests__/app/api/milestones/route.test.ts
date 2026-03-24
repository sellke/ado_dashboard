/**
 * @jest-environment node
 *
 * Tests for GET /api/milestones and POST /api/milestones.
 * Mocks prisma for unit testing.
 *
 * Story 3 — GET response is now a wrapper:
 *   { milestones: ApiMilestoneWithProgress[], programRollup: ApiProgramMilestoneRollup }
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

const mockMilestoneWithFeature = {
  ...mockMilestoneNoFeature,
  id: 'ms-2',
  adoFeatureId: 12345,
};

// Alias used by POST tests
const mockMilestone = mockMilestoneNoFeature;

// A child UserStory WorkItem returned by prisma.workItem.findMany
const mockChildStory = {
  parentAdoId: 12345,
  state: 'Done',
  storyPoints: 8,
  tags: 'ADP-MAR',
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

describe('GET /api/milestones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no child stories
    prisma.workItem.findMany.mockResolvedValue([]);
  });

  describe('response shape', () => {
    it('returns a wrapper object with milestones array and programRollup', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneNoFeature]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('milestones');
      expect(data).toHaveProperty('programRollup');
      expect(Array.isArray(data.milestones)).toBe(true);
    });

    it('includes base milestone fields in the milestones array', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneNoFeature]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(data.milestones[0]).toMatchObject({
        id: 'ms-1',
        title: 'Q1 Release',
        workstreamId: 'ws-1',
        targetMonth: '2026-03-01T00:00:00.000Z',
        status: 'NotStarted',
      });
      expect(data.milestones[0].workstream).toEqual({ id: 'ws-1', name: 'Platform' });
    });

    it('queries milestone.findMany with workstream include and targetMonth orderBy', async () => {
      prisma.milestone.findMany.mockResolvedValue([]);

      const req = new Request('http://localhost/api/milestones');
      await GET(req);

      expect(prisma.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { workstream: true },
          orderBy: { targetMonth: 'asc' },
        })
      );
    });

    it('returns empty milestones array and programRollup when no milestones exist', async () => {
      prisma.milestone.findMany.mockResolvedValue([]);

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
    it('milestone with adoFeatureId=null has completedPoints=0, totalPoints=0, percentComplete=null, burnupData=[]', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneNoFeature]);

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
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneWithFeature]);
      prisma.workItem.findMany.mockResolvedValue([mockChildStory]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      const m = data.milestones[0];
      expect(m.completedPoints).toBe(8);
      expect(m.totalPoints).toBe(8);
      expect(m.percentComplete).toBe(100);
    });

    it('milestone with partial progress returns correct percentComplete', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneWithFeature]);
      prisma.workItem.findMany.mockResolvedValue([
        { ...mockChildStory, state: 'Done', storyPoints: 5 },
        { ...mockChildStory, state: 'Active', storyPoints: 5 },
      ]);

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      const m = data.milestones[0];
      expect(m.completedPoints).toBe(5);
      expect(m.totalPoints).toBe(10);
      expect(m.percentComplete).toBe(50);
    });

    it('burnupData array is present and has correct structure', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneWithFeature]);
      prisma.workItem.findMany.mockResolvedValue([mockChildStory]);

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

    it('does not query workItem.findMany when no milestones have adoFeatureId', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneNoFeature]);

      const req = new Request('http://localhost/api/milestones');
      await GET(req);

      expect(prisma.workItem.findMany).not.toHaveBeenCalled();
    });

    it('queries workItem.findMany with parentAdoId filter when features exist', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneWithFeature]);
      prisma.workItem.findMany.mockResolvedValue([]);

      const req = new Request('http://localhost/api/milestones');
      await GET(req);

      expect(prisma.workItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            parentAdoId: { in: [12345] },
            type: 'UserStory',
          },
        })
      );
    });
  });

  describe('programRollup', () => {
    it('programRollup has required fields', async () => {
      prisma.milestone.findMany.mockResolvedValue([]);

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
    it('passes workstreamId where clause to findMany', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneNoFeature]);

      const req = new Request('http://localhost/api/milestones?workstreamId=ws-1');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('milestones');
      expect(data).toHaveProperty('programRollup');
      expect(prisma.milestone.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { workstreamId: 'ws-1' },
        })
      );
    });

    it('returns milestones and programRollup scoped to the filtered workstream', async () => {
      prisma.milestone.findMany.mockResolvedValue([mockMilestoneWithFeature]);
      prisma.workItem.findMany.mockResolvedValue([mockChildStory]);

      const req = new Request('http://localhost/api/milestones?workstreamId=ws-1');
      const res = await GET(req);
      const data = await res.json();

      expect(data.milestones).toHaveLength(1);
      expect(data.milestones[0].workstreamId).toBe('ws-1');
    });
  });

  describe('error handling', () => {
    it('returns 500 when prisma throws', async () => {
      prisma.milestone.findMany.mockRejectedValue(new Error('DB connection failed'));

      const req = new Request('http://localhost/api/milestones');
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe('DB connection failed');
    });
  });
});

describe('ADP-MON tag filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.milestone.findMany.mockResolvedValue([mockMilestoneWithFeature]);
  });

  it('AC1: only ADP-MON-tagged stories contribute to progress when mixed', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      { ...mockChildStory, state: 'Done', storyPoints: 8, tags: 'ADP-MAR' },
      { ...mockChildStory, state: 'Done', storyPoints: 5, tags: null },
      { ...mockChildStory, state: 'Done', storyPoints: 3, tags: 'Sprint Planning' },
    ]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    // Only the ADP-MAR story (8 pts) should count
    expect(m.totalPoints).toBe(8);
    expect(m.completedPoints).toBe(8);
    expect(m.percentComplete).toBe(100);
  });

  it('AC2: all-untagged feature has no progress and empty workstreamBreakdown', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      { ...mockChildStory, state: 'Done', storyPoints: 5, tags: 'Sprint Planning' },
      { ...mockChildStory, state: 'Active', storyPoints: 3, tags: 'Q4 PLAN' },
    ]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(0);
    expect(m.completedPoints).toBe(0);
    expect(m.workstreamBreakdown).toEqual([]);
  });

  it('AC3: stories with tags: null are excluded', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      { ...mockChildStory, state: 'Done', storyPoints: 13, tags: null },
      { ...mockChildStory, state: 'Done', storyPoints: 5, tags: 'ADP-MAR' },
    ]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(5);
    expect(m.completedPoints).toBe(5);
  });

  it('AC4: ADP-MON tag match is case-insensitive', async () => {
    prisma.workItem.findMany.mockResolvedValue([
      { ...mockChildStory, state: 'Done', storyPoints: 6, tags: 'adp-mar' },
      { ...mockChildStory, state: 'Done', storyPoints: 4, tags: 'ADP-mar' },
    ]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const m = data.milestones[0];
    expect(m.totalPoints).toBe(10);
    expect(m.completedPoints).toBe(10);
  });

  it('AC1 (workstreamBreakdown): only ADP-MON-tagged stories appear in breakdown', async () => {
    prisma.workItem.findMany.mockResolvedValue([
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
    ]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    const breakdown = data.milestones[0].workstreamBreakdown;
    // Only ws-1 (ADP-tagged) should appear; ws-2 (untagged) must be absent
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].workstreamId).toBe('ws-1');
    expect(breakdown[0].totalStories).toBe(1);
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
