/**
 * @jest-environment node
 *
 * Tests for GET /api/sprints/stories.
 * Validates sprint story grouping, status mapping, filtering, and error handling.
 */

import { GET } from '@/app/api/sprints/stories/route';
import { VISIBLE_SPRINT_TABS } from '@/lib/sync/window';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sprint: {
      findMany: jest.fn(),
    },
    workItem: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

const NOW = new Date('2026-03-01T12:00:00Z');

const mockSprints = [
  {
    id: 'sprint-5',
    name: 'Sprint 2026.05',
    startDate: new Date('2026-02-24'),
    endDate: new Date('2026-03-07'),
  },
  {
    id: 'sprint-4',
    name: 'Sprint 2026.04',
    startDate: new Date('2026-02-10'),
    endDate: new Date('2026-02-21'),
  },
  {
    id: 'sprint-3',
    name: 'Sprint 2026.03',
    startDate: new Date('2026-01-27'),
    endDate: new Date('2026-02-07'),
  },
  {
    id: 'sprint-2',
    name: 'Sprint 2026.02',
    startDate: new Date('2026-01-13'),
    endDate: new Date('2026-01-24'),
  },
  {
    id: 'sprint-1',
    name: 'Sprint 2026.01',
    startDate: new Date('2025-12-30'),
    endDate: new Date('2026-01-10'),
  },
];

describe('GET /api/sprints/stories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns stories grouped by sprint on happy path', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints);
    prisma.workItem.findMany.mockResolvedValue([
      {
        adoId: 12345,
        title: 'Implement auth flow',
        assignedTo: 'Jane Doe',
        storyPoints: 5,
        state: 'Active',
        sprintId: 'sprint-5',
      },
      {
        adoId: 12346,
        title: 'Design login page',
        assignedTo: null,
        storyPoints: 3,
        state: 'New',
        sprintId: 'sprint-5',
      },
    ]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sprints).toHaveLength(5);
    expect(prisma.sprint.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { startDate: 'desc' },
        take: VISIBLE_SPRINT_TABS,
      })
    );
    expect(data.sprints[0].id).toBe('sprint-5');
    expect(data.sprints[0].isCurrent).toBe(true);
    expect(data.sprints[0].stories).toHaveLength(2);
    expect(data.sprints[0].stories[0]).toMatchObject({
      adoId: 12345,
      title: 'Implement auth flow',
      assignedTo: 'Jane Doe',
      storyPoints: 5,
      state: 'Active',
      statusGroup: 'Active',
    });
    expect(data.sprints[0].stories[1]).toMatchObject({
      adoId: 12346,
      statusGroup: 'Planned',
    });
  });

  it('only queries UserStory type work items', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints);
    prisma.workItem.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    await GET(req);

    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'UserStory',
        }),
      })
    );
  });

  it('maps all ADO states to correct status groups', async () => {
    prisma.sprint.findMany.mockResolvedValue([mockSprints[0]]);
    prisma.workItem.findMany.mockResolvedValue([
      { adoId: 1, title: 'S1', assignedTo: null, storyPoints: 1, state: 'New', sprintId: 'sprint-5' },
      { adoId: 2, title: 'S2', assignedTo: null, storyPoints: 2, state: 'Approved', sprintId: 'sprint-5' },
      { adoId: 3, title: 'S3', assignedTo: null, storyPoints: 3, state: 'Committed', sprintId: 'sprint-5' },
      { adoId: 4, title: 'S4', assignedTo: null, storyPoints: 4, state: 'Active', sprintId: 'sprint-5' },
      { adoId: 5, title: 'S5', assignedTo: null, storyPoints: 5, state: 'Testing', sprintId: 'sprint-5' },
      { adoId: 6, title: 'S6', assignedTo: null, storyPoints: 6, state: 'Resolved', sprintId: 'sprint-5' },
      { adoId: 7, title: 'S7', assignedTo: null, storyPoints: 7, state: 'Closed', sprintId: 'sprint-5' },
    ]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();
    const stories = data.sprints[0].stories;

    expect(stories.find((s: { adoId: number }) => s.adoId === 1).statusGroup).toBe('Planned');
    expect(stories.find((s: { adoId: number }) => s.adoId === 2).statusGroup).toBe('Planned');
    expect(stories.find((s: { adoId: number }) => s.adoId === 3).statusGroup).toBe('Planned');
    expect(stories.find((s: { adoId: number }) => s.adoId === 4).statusGroup).toBe('Active');
    expect(stories.find((s: { adoId: number }) => s.adoId === 5).statusGroup).toBe('Testing');
    expect(stories.find((s: { adoId: number }) => s.adoId === 6).statusGroup).toBe('Resolved');
    expect(stories.find((s: { adoId: number }) => s.adoId === 7).statusGroup).toBe('Completed');
  });

  it('excludes Removed and unknown states from response', async () => {
    prisma.sprint.findMany.mockResolvedValue([mockSprints[0]]);
    prisma.workItem.findMany.mockResolvedValue([
      { adoId: 1, title: 'Active', assignedTo: null, storyPoints: 3, state: 'Active', sprintId: 'sprint-5' },
      { adoId: 2, title: 'Removed', assignedTo: null, storyPoints: 2, state: 'Removed', sprintId: 'sprint-5' },
      { adoId: 3, title: 'Unknown', assignedTo: null, storyPoints: 1, state: 'SomeWeirdState', sprintId: 'sprint-5' },
    ]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    expect(data.sprints[0].stories).toHaveLength(1);
    expect(data.sprints[0].stories[0].adoId).toBe(1);
  });

  it('returns sprints ordered most recent first', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints);
    prisma.workItem.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    const names = data.sprints.map((s: { name: string }) => s.name);
    expect(names).toEqual([
      'Sprint 2026.05',
      'Sprint 2026.04',
      'Sprint 2026.03',
      'Sprint 2026.02',
      'Sprint 2026.01',
    ]);
  });

  it('flags current sprint with isCurrent: true', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints);
    prisma.workItem.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    // sprint-5 is current (2026-02-24 to 2026-03-07, now is 2026-03-01)
    expect(data.sprints[0].isCurrent).toBe(true);
    expect(data.sprints[1].isCurrent).toBe(false);
    expect(data.sprints[2].isCurrent).toBe(false);
    expect(data.sprints[3].isCurrent).toBe(false);
    expect(data.sprints[4].isCurrent).toBe(false);
  });

  it('returns sprints with empty stories when workstream has no work items', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints);
    prisma.workItem.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-999');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sprints).toHaveLength(5);
    data.sprints.forEach((s: { stories: unknown[] }) => {
      expect(s.stories).toEqual([]);
    });
  });

  it('returns 400 when workstreamId is missing', async () => {
    const req = new Request('http://localhost/api/sprints/stories');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('workstreamId query parameter is required');
  });

  it('returns 500 on database error', async () => {
    prisma.sprint.findMany.mockRejectedValue(new Error('Database connection failed'));

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to fetch sprint stories');
  });

  it('returns empty sprints array when no sprints exist in database', async () => {
    prisma.sprint.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sprints).toEqual([]);
  });

  it('distributes stories to correct sprints when multiple sprints have data', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints.slice(0, 3));
    prisma.workItem.findMany.mockResolvedValue([
      { adoId: 100, title: 'Sprint 5 story', assignedTo: 'A', storyPoints: 3, state: 'Active', sprintId: 'sprint-5' },
      { adoId: 200, title: 'Sprint 4 story', assignedTo: 'B', storyPoints: 5, state: 'Closed', sprintId: 'sprint-4' },
      { adoId: 300, title: 'Sprint 3 story', assignedTo: null, storyPoints: null, state: 'New', sprintId: 'sprint-3' },
    ]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    expect(data.sprints[0].stories).toHaveLength(1);
    expect(data.sprints[0].stories[0].adoId).toBe(100);
    expect(data.sprints[1].stories).toHaveLength(1);
    expect(data.sprints[1].stories[0].adoId).toBe(200);
    expect(data.sprints[2].stories).toHaveLength(1);
    expect(data.sprints[2].stories[0].adoId).toBe(300);
  });

  it('includes null storyPoints and assignedTo in response', async () => {
    prisma.sprint.findMany.mockResolvedValue([mockSprints[0]]);
    prisma.workItem.findMany.mockResolvedValue([
      { adoId: 1, title: 'Unestimated', assignedTo: null, storyPoints: null, state: 'New', sprintId: 'sprint-5' },
    ]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-1');
    const res = await GET(req);
    const data = await res.json();

    expect(data.sprints[0].stories[0]).toMatchObject({
      adoId: 1,
      assignedTo: null,
      storyPoints: null,
    });
  });

  it('passes workstreamId to Prisma work item query', async () => {
    prisma.sprint.findMany.mockResolvedValue(mockSprints);
    prisma.workItem.findMany.mockResolvedValue([]);

    const req = new Request('http://localhost/api/sprints/stories?workstreamId=ws-42');
    await GET(req);

    expect(prisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workstreamId: 'ws-42',
        }),
      })
    );
  });
});
