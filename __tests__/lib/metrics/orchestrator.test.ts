/**
 * @jest-environment node
 *
 * Integration tests for computeAllMetrics().
 * Uses test database; requires real Prisma client.
 */

import { computeAllMetrics } from '@/lib/metrics/orchestrator';
import { computeWorkstreamMetrics } from '@/lib/metrics/snapshot';
import { cleanupTestData, prisma } from '../../prisma/helpers';

describe('computeAllMetrics', () => {
  let sprintId: string;
  let ws1Id: string;
  let ws2Id: string;
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

    const ws1 = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });
    ws1Id = ws1.id;

    const ws2 = await prisma.workstream.create({
      data: { name: 'Pitch Tracker', adoAreaPath: 'Project\\Pitch Tracker' },
    });
    ws2Id = ws2.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('should compute metrics for multiple workstreams successfully', async () => {
    await prisma.sprintWorkstream.createMany({
      data: [
        { sprintId, workstreamId: ws1Id, grossHours: 80, ceremonyHours: 16 },
        { sprintId, workstreamId: ws2Id, grossHours: 60, ceremonyHours: 12 },
      ],
    });

    await prisma.workItem.createMany({
      data: [
        {
          adoId: 3001,
          type: 'UserStory',
          title: 'US 1',
          state: 'Done',
          storyPoints: 10,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId: ws1Id,
          sprintId,
        },
        {
          adoId: 3002,
          type: 'UserStory',
          title: 'US 2',
          state: 'Closed',
          storyPoints: 5,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId: ws1Id,
          sprintId,
        },
        {
          adoId: 3003,
          type: 'UserStory',
          title: 'US 3',
          state: 'Done',
          storyPoints: 8,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId: ws2Id,
          sprintId,
        },
      ],
    });

    const result = await computeAllMetrics(sprintId, prisma);

    expect(result.sprintId).toBe(sprintId);
    expect(result.sprintName).toBe('Sprint 26.26');
    expect(result.workstreams).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.program).not.toBeNull();
    expect(result.program!.workstreamCount).toBe(2);
    expect(result.program!.velocity.value).toBe(23); // 10+5+8
    expect(result.computedAt).toBeInstanceOf(Date);

    const snapshots = await prisma.metricSnapshot.findMany({
      where: { sprintId },
    });
    expect(snapshots).toHaveLength(2);
  });

  it('should isolate failures: one workstream fails, others still succeed', async () => {
    // Inject a computeFn that throws for ws2 but delegates to the real function for ws1
    const failingComputeFn = async (s: string, w: string, start: Date, db: any) => {
      if (w === ws2Id) throw new Error('Simulated workstream failure');
      return computeWorkstreamMetrics(s, w, start, db);
    };

    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId: ws1Id,
        grossHours: 80,
        ceremonyHours: 16,
      },
    });

    await prisma.workItem.create({
      data: {
        adoId: 4001,
        type: 'UserStory',
        title: 'US 1',
        state: 'Done',
        storyPoints: 10,
        areaPath: 'Area',
        iterationPath: 'Iter',
        workstreamId: ws1Id,
        sprintId,
      },
    });

    const result = await computeAllMetrics(sprintId, { db: prisma, computeFn: failingComputeFn });

    expect(result.workstreams).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      workstreamId: ws2Id,
      error: 'Simulated workstream failure',
    });

    const ws1Snapshot = await prisma.metricSnapshot.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId: ws1Id } },
    });
    expect(ws1Snapshot).not.toBeNull();
    expect(ws1Snapshot!.velocity).toBe(10);
  });

  it('should return program aggregate when workstreams succeed', async () => {
    await prisma.sprintWorkstream.createMany({
      data: [
        { sprintId, workstreamId: ws1Id, grossHours: 80, ceremonyHours: 16 },
        { sprintId, workstreamId: ws2Id, grossHours: 60, ceremonyHours: 12 },
      ],
    });

    await prisma.workItem.createMany({
      data: [
        {
          adoId: 5001,
          type: 'UserStory',
          title: 'US 1',
          state: 'Done',
          storyPoints: 20,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId: ws1Id,
          sprintId,
        },
        {
          adoId: 5002,
          type: 'UserStory',
          title: 'US 2',
          state: 'Done',
          storyPoints: 15,
          areaPath: 'Area',
          iterationPath: 'Iter',
          workstreamId: ws2Id,
          sprintId,
        },
      ],
    });

    const result = await computeAllMetrics(sprintId, prisma);

    expect(result.program).not.toBeNull();
    expect(result.program!.velocity.value).toBe(35);
    expect(result.program!.totalPlannedPoints).toBe(35);
    expect(result.program!.totalCompletedPoints).toBe(35);
    expect(result.program!.workstreamCount).toBe(2);
    expect(result.program!.velocity).toHaveProperty('rag');
    expect(result.program!.overheadPercent).toHaveProperty('rag');
    expect(result.program!.predictability).toHaveProperty('rag');
    expect(result.program!.carryOverRate).toHaveProperty('rag');
  });

  it('should return errors array (structure check)', async () => {
    await prisma.sprintWorkstream.create({
      data: { sprintId, workstreamId: ws1Id, grossHours: 80, ceremonyHours: 16 },
    });

    const result = await computeAllMetrics(sprintId, prisma);

    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.every((e) => 'workstreamId' in e && 'error' in e)).toBe(true);
  });

  it('should default to most recent sprint when sprintId not provided', async () => {
    const olderSprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 26.25',
        startDate: new Date('2026-03-30'),
        endDate: new Date('2026-04-10'),
      },
    });

    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId: ws1Id,
        grossHours: 80,
        ceremonyHours: 16,
      },
    });

    const result = await computeAllMetrics(undefined, prisma);

    expect(result.sprintId).toBe(sprintId);
    expect(result.sprintId).not.toBe(olderSprint.id);
  });

  it('should throw when sprint not found', async () => {
    const invalidSprintId = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx';

    await expect(computeAllMetrics(invalidSprintId, prisma)).rejects.toThrow(/Sprint not found/);
  });

  it('should throw when no sprints exist and sprintId not provided', async () => {
    await prisma.metricSnapshot.deleteMany({});
    await prisma.sprintWorkstream.deleteMany({});
    await prisma.workItem.deleteMany({});
    await prisma.sprint.deleteMany({});

    await expect(computeAllMetrics(undefined, prisma)).rejects.toThrow(/No sprints found/);
  });
});
