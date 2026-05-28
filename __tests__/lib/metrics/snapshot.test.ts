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
        name: 'Sprint 26.26',
        startDate: new Date('2026-04-13'),
        endDate: new Date('2026-04-24'),
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

  it('should use projected velocity for the current sprint (exclude in-progress actual)', async () => {
    const now = new Date();
    const currentSprint = await prisma.sprint.create({
      data: {
        name: 'Current Sprint',
        startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
        velocity: 20,
        overheadPercent: 25,
        predictability: 80,
        carryOverRate: 10,
        carryOverItems: 1,
        carryOverPoints: 2,
        plannedPoints: 30,
        completedPoints: 20,
        overheadHours: 10,
        grossHours: 40,
        velocityAvg: null,
        overheadPercentAvg: null,
        predictabilityAvg: null,
        carryOverRateAvg: null,
        velocityRag: 'Green',
        overheadRag: 'Green',
        predictabilityRag: 'Green',
        carryOverRag: 'Green',
      },
    });

    await prisma.workItem.createMany({
      data: [
        {
          adoId: 9101,
          type: 'UserStory',
          title: 'Current US 1',
          state: 'Done',
          storyPoints: 5,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId: currentSprint.id,
        },
        {
          adoId: 9102,
          type: 'UserStory',
          title: 'Current US 2',
          state: 'Done',
          storyPoints: 8,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId: currentSprint.id,
        },
      ],
    });

    await computeWorkstreamMetrics(currentSprint.id, workstreamId, currentSprint.startDate, prisma);

    const snapshot = await prisma.metricSnapshot.findUnique({
      where: { sprintId_workstreamId: { sprintId: currentSprint.id, workstreamId } },
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot!.velocity).toBe(20);
    expect(snapshot!.velocityAvg).toBe(20);
    expect(snapshot!.velocityRag).toBeNull();
  });

  describe('SprintPlanSnapshot capture', () => {
    it('should upsert snapshot rows for current sprint work items', async () => {
      const now = new Date();
      const currentSprint = await prisma.sprint.create({
        data: {
          name: 'Current Sprint - Snapshot',
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.workItem.createMany({
        data: [
          {
            adoId: 5001,
            type: 'UserStory',
            title: 'Snap US 1',
            state: 'Active',
            storyPoints: 5,
            areaPath: 'Area',
            iterationPath: 'Iter',
            workstreamId,
            sprintId: currentSprint.id,
          },
          {
            adoId: 5002,
            type: 'Bug',
            title: 'Snap Bug 1',
            state: 'Done',
            storyPoints: 3,
            areaPath: 'Area',
            iterationPath: 'Iter',
            workstreamId,
            sprintId: currentSprint.id,
          },
        ],
      });

      await computeWorkstreamMetrics(currentSprint.id, workstreamId, currentSprint.startDate, prisma);

      const snapshots = await prisma.sprintPlanSnapshot.findMany({
        where: { sprintId: currentSprint.id, workstreamId },
        orderBy: { adoId: 'asc' },
      });

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]).toMatchObject({
        adoId: 5001,
        storyPoints: 5,
        state: 'Active',
        type: 'UserStory',
      });
      expect(snapshots[1]).toMatchObject({
        adoId: 5002,
        storyPoints: 3,
        state: 'Done',
        type: 'Bug',
      });
    });

    it('should NOT write snapshot rows for completed sprints', async () => {
      // Default sprint dates are in the past → completed
      await prisma.workItem.create({
        data: {
          adoId: 5003,
          type: 'UserStory',
          title: 'Past US',
          state: 'Done',
          storyPoints: 8,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId,
        },
      });

      await computeWorkstreamMetrics(sprintId, workstreamId, sprintStart, prisma);

      const snapshots = await prisma.sprintPlanSnapshot.findMany({
        where: { sprintId, workstreamId },
      });

      expect(snapshots).toHaveLength(0);
    });

    it('should update snapshot rows on re-computation (idempotent upsert)', async () => {
      const now = new Date();
      const currentSprint = await prisma.sprint.create({
        data: {
          name: 'Current Sprint - Upsert',
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
      });

      const wi = await prisma.workItem.create({
        data: {
          adoId: 5010,
          type: 'UserStory',
          title: 'Upsert US',
          state: 'Active',
          storyPoints: 3,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId,
          sprintId: currentSprint.id,
        },
      });

      await computeWorkstreamMetrics(currentSprint.id, workstreamId, currentSprint.startDate, prisma);

      // Update the work item state
      await prisma.workItem.update({
        where: { id: wi.id },
        data: { state: 'Done', storyPoints: 5 },
      });

      await computeWorkstreamMetrics(currentSprint.id, workstreamId, currentSprint.startDate, prisma);

      const snapshots = await prisma.sprintPlanSnapshot.findMany({
        where: { sprintId: currentSprint.id, workstreamId },
      });

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]).toMatchObject({
        adoId: 5010,
        state: 'Done',
        storyPoints: 5,
      });
    });

    it('should remove stale snapshot rows for items no longer in the sprint', async () => {
      const now = new Date();
      const currentSprint = await prisma.sprint.create({
        data: {
          name: 'Current Sprint - Stale',
          startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.workItem.createMany({
        data: [
          {
            adoId: 5020,
            type: 'UserStory',
            title: 'Stays',
            state: 'Active',
            storyPoints: 5,
            areaPath: 'Area',
            iterationPath: 'Iter',
            workstreamId,
            sprintId: currentSprint.id,
          },
          {
            adoId: 5021,
            type: 'UserStory',
            title: 'Will Move',
            state: 'Active',
            storyPoints: 3,
            areaPath: 'Area',
            iterationPath: 'Iter',
            workstreamId,
            sprintId: currentSprint.id,
          },
        ],
      });

      // First compute: both items snapshotted
      await computeWorkstreamMetrics(currentSprint.id, workstreamId, currentSprint.startDate, prisma);

      let snapshots = await prisma.sprintPlanSnapshot.findMany({
        where: { sprintId: currentSprint.id, workstreamId },
      });
      expect(snapshots).toHaveLength(2);

      // Move item 5021 out of the sprint (simulating ADO reassignment)
      await prisma.workItem.update({
        where: { adoId: 5021 },
        data: { sprintId: sprintId }, // move to the other (past) sprint
      });

      // Second compute: stale row should be removed
      await computeWorkstreamMetrics(currentSprint.id, workstreamId, currentSprint.startDate, prisma);

      snapshots = await prisma.sprintPlanSnapshot.findMany({
        where: { sprintId: currentSprint.id, workstreamId },
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].adoId).toBe(5020);
    });
  });
});
