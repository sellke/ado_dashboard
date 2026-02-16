/**
 * @jest-environment node
 *
 * Tests for GET /api/milestones and POST /api/milestones.
 * Mocks prisma for unit testing.
 */

import { GET, POST } from '@/app/api/milestones/route';

const mockWorkstream = { id: 'ws-1', name: 'Platform', adoAreaPath: 'Area\\Platform' };

const mockMilestone = {
  id: 'ms-1',
  title: 'Q1 Release',
  workstreamId: 'ws-1',
  targetMonth: new Date('2026-03-01'),
  status: 'NotStarted' as const,
  adoFeatureId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  workstream: mockWorkstream,
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    milestone: {
      findMany: jest.fn(),
      create: jest.fn(),
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
  });

  it('should return all milestones with workstream relation, ordered by targetMonth', async () => {
    prisma.milestone.findMany.mockResolvedValue([mockMilestone]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: 'ms-1',
      title: 'Q1 Release',
      workstreamId: 'ws-1',
      targetMonth: '2026-03-01T00:00:00.000Z',
      status: 'NotStarted',
    });
    expect(data[0].workstream).toEqual({ id: 'ws-1', name: 'Platform' });
    expect(prisma.milestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { workstream: true },
        orderBy: { targetMonth: 'asc' },
      })
    );
  });

  it('should return empty array when no milestones exist', async () => {
    prisma.milestone.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/milestones');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should filter by workstreamId when provided', async () => {
    prisma.milestone.findMany.mockResolvedValue([mockMilestone]);

    const req = new Request('http://localhost/api/milestones?workstreamId=ws-1');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(prisma.milestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workstreamId: 'ws-1' },
      })
    );
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
