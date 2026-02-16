/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('SprintWorkstream model', () => {
  let sprintId: string;
  let workstreamId: string;

  beforeEach(async () => {
    // Create prerequisite Sprint and Workstream for each test
    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });
    sprintId = sprint.id;

    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });
    workstreamId = workstream.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a SprintWorkstream linking a Sprint and Workstream', async () => {
    const sw = await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    expect(sw.sprintId).toBe(sprintId);
    expect(sw.workstreamId).toBe(workstreamId);
    expect(sw.id).toBeDefined();
  });

  it('should enforce unique composite constraint on [sprintId, workstreamId]', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    // Attempting to create a duplicate should fail with P2002 (unique constraint violation)
    await expect(
      prisma.sprintWorkstream.create({
        data: {
          sprintId,
          workstreamId,
        },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('should allow nullable capacity fields', async () => {
    const sw = await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    expect(sw.plannedPoints).toBeNull();
    expect(sw.completedPoints).toBeNull();
    expect(sw.grossHours).toBeNull();
    expect(sw.ptoHours).toBeNull();
    expect(sw.ceremonyHours).toBeNull();
    expect(sw.fteCount).toBeNull();
    expect(sw.notes).toBeNull();
  });

  it('should default capacityLocked to false', async () => {
    const sw = await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    expect(sw.capacityLocked).toBe(false);
  });

  it('should allow updating capacity fields', async () => {
    const sw = await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    const updated = await prisma.sprintWorkstream.update({
      where: { id: sw.id },
      data: {
        plannedPoints: 21.0,
        completedPoints: 18.5,
        grossHours: 160.0,
        ptoHours: 8.0,
        ceremonyHours: 12.0,
        fteCount: 5,
        capacityLocked: true,
        notes: 'Good sprint',
      },
    });

    expect(updated.plannedPoints).toBe(21.0);
    expect(updated.completedPoints).toBe(18.5);
    expect(updated.grossHours).toBe(160.0);
    expect(updated.ptoHours).toBe(8.0);
    expect(updated.ceremonyHours).toBe(12.0);
    expect(updated.fteCount).toBe(5);
    expect(updated.capacityLocked).toBe(true);
    expect(updated.notes).toBe('Good sprint');
  });

  it('should cascade delete when Sprint is deleted', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    // Delete the sprint - should cascade to SprintWorkstream
    await prisma.sprint.delete({ where: { id: sprintId } });

    const remaining = await prisma.sprintWorkstream.findMany({
      where: { sprintId },
    });

    expect(remaining).toHaveLength(0);
  });

  it('should cascade delete when Workstream is deleted', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    // Delete the workstream - should cascade to SprintWorkstream
    await prisma.workstream.delete({ where: { id: workstreamId } });

    const remaining = await prisma.sprintWorkstream.findMany({
      where: { workstreamId },
    });

    expect(remaining).toHaveLength(0);
  });

  it('should allow navigation from Sprint -> SprintWorkstream -> Workstream', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        sprintWorkstreams: {
          include: {
            workstream: true,
          },
        },
      },
    });

    expect(sprint).not.toBeNull();
    expect(sprint!.sprintWorkstreams).toHaveLength(1);
    expect(sprint!.sprintWorkstreams[0].workstream.name).toBe('Platform');
    expect(sprint!.sprintWorkstreams[0].workstream.adoAreaPath).toBe('Project\\Platform');
  });

  it('should allow navigation from Workstream -> SprintWorkstream -> Sprint', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    const workstream = await prisma.workstream.findUnique({
      where: { id: workstreamId },
      include: {
        sprintWorkstreams: {
          include: {
            sprint: true,
          },
        },
      },
    });

    expect(workstream).not.toBeNull();
    expect(workstream!.sprintWorkstreams).toHaveLength(1);
    expect(workstream!.sprintWorkstreams[0].sprint.name).toBe('Sprint 1');
    expect(workstream!.sprintWorkstreams[0].sprint.startDate).toEqual(new Date('2026-01-01'));
    expect(workstream!.sprintWorkstreams[0].sprint.endDate).toEqual(new Date('2026-01-14'));
  });
});
