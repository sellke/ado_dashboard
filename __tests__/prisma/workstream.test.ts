/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('Workstream model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a workstream with name and adoAreaPath', async () => {
    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });

    expect(workstream.name).toBe('Platform');
    expect(workstream.adoAreaPath).toBe('Project\\Platform');
  });

  it('should auto-generate a CUID ID', async () => {
    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });

    expect(workstream.id).toBeDefined();
    expect(typeof workstream.id).toBe('string');
    expect(workstream.id.length).toBeGreaterThan(0);
  });

  it('should auto-set createdAt and updatedAt timestamps', async () => {
    const before = new Date();

    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });

    const after = new Date();

    expect(workstream.createdAt).toBeInstanceOf(Date);
    expect(workstream.updatedAt).toBeInstanceOf(Date);
    expect(workstream.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(workstream.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should require name field (not nullable)', async () => {
    await expect(
      prisma.workstream.create({
        data: {
          name: undefined as unknown as string,
          adoAreaPath: 'Project\\Platform',
        },
      })
    ).rejects.toThrow();
  });

  it('should require adoAreaPath field (not nullable)', async () => {
    await expect(
      prisma.workstream.create({
        data: {
          name: 'Platform',
          adoAreaPath: undefined as unknown as string,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow querying workstream with its sprintWorkstreams relation', async () => {
    const workstream = await prisma.workstream.create({
      data: {
        name: 'Platform',
        adoAreaPath: 'Project\\Platform',
      },
    });

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    await prisma.sprintWorkstream.create({
      data: {
        sprintId: sprint.id,
        workstreamId: workstream.id,
      },
    });

    const result = await prisma.workstream.findUnique({
      where: { id: workstream.id },
      include: { sprintWorkstreams: true },
    });

    expect(result).not.toBeNull();
    expect(result!.sprintWorkstreams).toHaveLength(1);
    expect(result!.sprintWorkstreams[0].sprintId).toBe(sprint.id);
    expect(result!.sprintWorkstreams[0].workstreamId).toBe(workstream.id);
  });
});
