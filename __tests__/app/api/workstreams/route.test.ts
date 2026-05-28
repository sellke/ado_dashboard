/**
 * @jest-environment node
 */

import { GET } from '@/app/api/workstreams/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    workstream: {
      findMany: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

describe('GET /api/workstreams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all synced workstreams sorted by display name', async () => {
    prisma.workstream.findMany.mockResolvedValue([
      { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
      { id: 'ws-2', name: 'Pitch Tracker', adoAreaPath: 'Area\\Pitch Tracker' },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.workstreams).toEqual([
      { id: 'ws-1', name: 'Action Tracker', adoAreaPath: 'Area\\Action Tracker' },
      { id: 'ws-2', name: 'Pitch Tracker', adoAreaPath: 'Area\\Pitch Tracker' },
    ]);
    expect(prisma.workstream.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, adoAreaPath: true },
      orderBy: { name: 'asc' },
    });
  });

  it('returns an error when Prisma throws', async () => {
    prisma.workstream.findMany.mockRejectedValue(new Error('DB unavailable'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('DB unavailable');
  });
});
