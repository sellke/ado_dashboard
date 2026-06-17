/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/workstreams/route';

jest.mock('@/lib/db/bootstrap', () => ({
  bootstrapDefaultDataIfEmpty: jest.fn().mockResolvedValue({
    bootstrapped: false,
    workstreamsCreated: 0,
  }),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([]),
    workstream: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

describe('GET /api/workstreams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.workstream.findFirst.mockResolvedValue(null);
    prisma.workstream.create.mockResolvedValue({
      id: 'ws-3',
      name: 'New Team',
      adoOrg: 'Operations-Innovation',
      adoProject: 'Event Streaming Platform',
      adoTeamId: 'team-3',
      adoAreaPath: 'Area\\New Team',
      syncEnabled: true,
    });
  });

  it('returns enabled workstreams sorted by display name', async () => {
    prisma.workstream.findMany.mockResolvedValue([
      {
        id: 'ws-1',
        name: 'Action Tracker',
        adoOrg: 'Operations-Innovation',
        adoProject: 'Event Streaming Platform',
        adoTeamId: 'team-1',
        adoAreaPath: 'Area\\Action Tracker',
        syncEnabled: true,
      },
    ]);

    const res = await GET(new Request('http://localhost/api/workstreams'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams).toHaveLength(1);
    expect(prisma.workstream.findMany).toHaveBeenCalledWith({
      where: { syncEnabled: true },
      select: {
        id: true,
        name: true,
        adoAreaPath: true,
        adoOrg: true,
        adoProject: true,
        adoTeamId: true,
        syncEnabled: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('includes disabled rows for admin requests', async () => {
    prisma.workstream.findMany.mockResolvedValue([]);

    await GET(new Request('http://localhost/api/workstreams?includeDisabled=true'));

    expect(prisma.workstream.findMany).toHaveBeenCalledWith({
      where: undefined,
      select: expect.any(Object),
      orderBy: { name: 'asc' },
    });
  });

  it('creates a workstream from a valid registry payload', async () => {
    const res = await POST(
      new Request('http://localhost/api/workstreams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Team',
          adoOrg: 'Operations-Innovation',
          adoProject: 'Event Streaming Platform',
          adoTeamId: 'team-3',
          adoAreaPath: 'Area\\New Team',
        }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.workstream.name).toBe('New Team');
    expect(prisma.workstream.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ syncEnabled: true }),
      })
    );
  });

  it('returns 422 for duplicate workstream names', async () => {
    prisma.workstream.findFirst.mockResolvedValue({ id: 'existing' });

    const res = await POST(
      new Request('http://localhost/api/workstreams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Team',
          adoOrg: 'Operations-Innovation',
          adoProject: 'Event Streaming Platform',
          adoTeamId: 'team-3',
          adoAreaPath: 'Area\\New Team',
        }),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual([expect.objectContaining({ field: 'name' })]);
    expect(prisma.workstream.create).not.toHaveBeenCalled();
  });

  it('returns an error when Prisma throws', async () => {
    prisma.workstream.findMany.mockRejectedValue(new Error('DB unavailable'));

    const res = await GET(new Request('http://localhost/api/workstreams'));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('DB unavailable');
  });
});
