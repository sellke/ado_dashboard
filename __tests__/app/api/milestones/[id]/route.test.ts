/**
 * @jest-environment node
 *
 * Tests for PATCH /api/milestones/[id] and DELETE /api/milestones/[id].
 * Mocks prisma for unit testing.
 */

import { DELETE, PATCH } from '@/app/api/milestones/[id]/route';

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
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workstream: {
      findUnique: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

describe('PATCH /api/milestones/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update milestone with valid fields and return 200', async () => {
    prisma.milestone.findUnique.mockResolvedValue(mockMilestone);
    prisma.milestone.update.mockResolvedValue({
      ...mockMilestone,
      title: 'Q1 Release Updated',
      status: 'InProgress',
      workstream: mockWorkstream,
    });

    const req = new Request('http://localhost/api/milestones/ms-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Q1 Release Updated',
        status: 'InProgress',
      }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ms-1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      id: 'ms-1',
      title: 'Q1 Release Updated',
      status: 'InProgress',
    });
    expect(data.workstream).toEqual({ id: 'ws-1', name: 'Platform' });
    expect(prisma.milestone.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ms-1' },
        data: expect.objectContaining({
          title: 'Q1 Release Updated',
          status: 'InProgress',
        }),
      })
    );
  });

  it('should return 404 when milestone not found', async () => {
    prisma.milestone.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/milestones/ms-nonexistent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated' }),
    });
    const res = await PATCH(req, {
      params: Promise.resolve({ id: 'ms-nonexistent' }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid status on update', async () => {
    prisma.milestone.findUnique.mockResolvedValue(mockMilestone);

    const req = new Request('http://localhost/api/milestones/ms-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Invalid' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ms-1' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toBeDefined();
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });

  it('should return 400 when workstreamId provided but does not exist', async () => {
    prisma.milestone.findUnique.mockResolvedValue(mockMilestone);
    prisma.workstream.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/milestones/ms-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workstreamId: 'ws-bad' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ms-1' }) });

    expect(res.status).toBe(400);
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });

  it('should return 400 for malformed targetMonth on update', async () => {
    prisma.milestone.findUnique.mockResolvedValue(mockMilestone);

    const req = new Request('http://localhost/api/milestones/ms-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetMonth: 'invalid-date' }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'ms-1' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.errors).toEqual(expect.arrayContaining([expect.stringContaining('targetMonth')]));
    expect(prisma.milestone.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/milestones/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete milestone and return 204', async () => {
    prisma.milestone.findUnique.mockResolvedValue(mockMilestone);
    prisma.milestone.delete.mockResolvedValue(mockMilestone);

    const req = new Request('http://localhost/api/milestones/ms-1', {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'ms-1' }) });

    expect(res.status).toBe(204);
    expect(res.status).not.toBe(200);
    expect(prisma.milestone.delete).toHaveBeenCalledWith({
      where: { id: 'ms-1' },
    });
  });

  it('should return 404 when milestone not found for delete', async () => {
    prisma.milestone.findUnique.mockResolvedValue(null);

    const req = new Request('http://localhost/api/milestones/ms-nonexistent', {
      method: 'DELETE',
    });
    const res = await DELETE(req, {
      params: Promise.resolve({ id: 'ms-nonexistent' }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain('not found');
    expect(prisma.milestone.delete).not.toHaveBeenCalled();
  });
});
