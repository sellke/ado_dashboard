/**
 * @jest-environment node
 *
 * Integration tests for computeWorkstreamMetrics().
 * Uses test database; requires real Prisma client.
 */

import { computeWorkstreamMetrics } from '@/lib/metrics/snapshot';
import { cleanupTestData, prisma } from '../../prisma/helpers';

describe('computeWorkstreamMetrics', () => {
  let sprintId: string;
  let workstreamId: string;
  let sprintStart: Date;

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 26.21',
        startDate: new Date('2026-01-06'),
        endDate: new Date('2026-01-19'),
      },
    });
    sprintId = sprint.id;
    sprintStart = sprint.startDate;

    const workstream = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });
    workstreamId = workstream.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('should upsert correct MetricSnapshot when all data present (happy path)', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
        grossHours: 80,
        ceremonyHours: 16,
      },
    });

    await prisma.workItem.createMany({
      data: [
        {
          adoId: 1001,
          type: 'UserStory',
          title: 'US 1',
          state: 'Done',
          storyPoints: 5,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId,
        },
        {
          adoId: 1002,
          type: 'UserStory',
          title: 'US 2',
          state: 'Closed',
          storyPoints: 8,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId,
        },
        {
          adoId: 1003,
          type: 'UserStory',
          title: 'US 3',
          state: 'Active',
          storyPoints: 3,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId,
        },
        {
          adoId: 1004,
          type: 'UserStory',
          title: 'US 4',
          state: 'New',
          storyPoints: 5,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId,
        },
      ],
    });

    await computeWorkstreamMetrics(sprintId, workstreamId, sprintStart, prisma);

    const snapshot = await prisma.metricSnapshot.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId } },
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot!.velocity).toBe(13); // 5+8 from Done/Closed
    expect(snapshot!.plannedPoints).toBe(21); // 5+8+3+5
    expect(snapshot!.completedPoints).toBe(13); // 5+8
    expect(snapshot!.overheadPercent).not.toBeNull();
    expect(snapshot!.predictability).not.toBeNull();
    expect(snapshot!.carryOverRate).not.toBeNull();
    expect(snapshot!.carryOverItems).toBe(2); // Active, New
    expect(snapshot!.carryOverPoints).toBe(8); // 3+5
    expect(snapshot!.computedAt).toBeInstanceOf(Date);
  });

  it('should handle missing SprintWorkstream (overhead null, rest computed)', async () => {
    await prisma.workItem.create({
      data: {
        adoId: 2001,
        type: 'UserStory',
        title: 'US 1',
        state: 'Done',
        storyPoints: 10,
        areaPath: 'Area',
        iterationPath: 'Iter',
        workstreamId,
        sprintId,
      },
    });

    await computeWorkstreamMetrics(sprintId, workstreamId, sprintStart, prisma);

    const snapshot = await prisma.metricSnapshot.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId } },
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot!.velocity).toBe(10);
    expect(snapshot!.overheadPercent).toBeNull(); // no grossHours
    expect(snapshot!.grossHours).toBeNull();
    expect(snapshot!.overheadHours).not.toBeNull(); // ceremony 0, bug/spike/support hours
    expect(snapshot!.predictability).not.toBeNull();
    expect(snapshot!.carryOverRate).not.toBeNull();
  });

  it('should handle no work items (velocity 0, predictability null, carryOver null)', async () => {
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId,
        grossHours: 80,
        ceremonyHours: 16,
      },
    });

    await computeWorkstreamMetrics(sprintId, workstreamId, sprintStart, prisma);

    const snapshot = await prisma.metricSnapshot.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId } },
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot!.velocity).toBe(0);
    expect(snapshot!.predictability).toBeNull();
    expect(snapshot!.carryOverRate).toBeNull();
    expect(snapshot!.carryOverItems).toBeNull();
    expect(snapshot!.carryOverPoints).toBeNull();
    expect(snapshot!.plannedPoints).toBeNull();
    expect(snapshot!.completedPoints).toBeNull();
    expect(snapshot!.overheadPercent).not.toBeNull(); // ceremony 16/80 = 20%
  });

  it('should throw when sprintId is invalid', async () => {
    const invalidSprintId = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx';

    await expect(
      computeWorkstreamMetrics(invalidSprintId, workstreamId, sprintStart, prisma)
    ).rejects.toThrow(/Sprint not found/);
  });

  it('should throw when workstreamId is invalid', async () => {
    const invalidWorkstreamId = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx';

    await expect(
      computeWorkstreamMetrics(sprintId, invalidWorkstreamId, sprintStart, prisma)
    ).rejects.toThrow(/Workstream not found/);
  });
});
