/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('Sprint model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a sprint with name, startDate, and endDate', async () => {
    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    expect(sprint.name).toBe('Sprint 1');
    expect(sprint.startDate).toEqual(new Date('2026-01-01'));
    expect(sprint.endDate).toEqual(new Date('2026-01-14'));
  });

  it('should auto-generate a CUID ID', async () => {
    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    expect(sprint.id).toBeDefined();
    expect(typeof sprint.id).toBe('string');
    expect(sprint.id.length).toBeGreaterThan(0);
  });

  it('should auto-set createdAt and updatedAt timestamps', async () => {
    const before = new Date();

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    const after = new Date();

    expect(sprint.createdAt).toBeInstanceOf(Date);
    expect(sprint.updatedAt).toBeInstanceOf(Date);
    expect(sprint.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(sprint.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should allow nullable adoIterationPath', async () => {
    const sprintWithout = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    expect(sprintWithout.adoIterationPath).toBeNull();

    const sprintWith = await prisma.sprint.create({
      data: {
        name: 'Sprint 2',
        adoIterationPath: 'Project\\Iteration\\Sprint 2',
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-01-28'),
      },
    });

    expect(sprintWith.adoIterationPath).toBe('Project\\Iteration\\Sprint 2');
  });

  it('should require name, startDate, endDate', async () => {
    // Missing name
    await expect(
      prisma.sprint.create({
        data: {
          name: undefined as unknown as string,
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-01-14'),
        },
      })
    ).rejects.toThrow();

    // Missing startDate
    await expect(
      prisma.sprint.create({
        data: {
          name: 'Sprint 1',
          startDate: undefined as unknown as Date,
          endDate: new Date('2026-01-14'),
        },
      })
    ).rejects.toThrow();

    // Missing endDate
    await expect(
      prisma.sprint.create({
        data: {
          name: 'Sprint 1',
          startDate: new Date('2026-01-01'),
          endDate: undefined as unknown as Date,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow querying sprint with its sprintWorkstreams relation', async () => {
    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });

    await prisma.sprintWorkstream.create({
      data: {
        sprintId: sprint.id,
        workstreamId: workstream.id,
      },
    });

    const result = await prisma.sprint.findUnique({
      where: { id: sprint.id },
      include: { sprintWorkstreams: true },
    });

    expect(result).not.toBeNull();
    expect(result!.sprintWorkstreams).toHaveLength(1);
    expect(result!.sprintWorkstreams[0].sprintId).toBe(sprint.id);
    expect(result!.sprintWorkstreams[0].workstreamId).toBe(workstream.id);
  });
});
