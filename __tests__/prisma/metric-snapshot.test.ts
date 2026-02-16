/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('MetricSnapshot model', () => {
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

  it('should create a MetricSnapshot with all nullable fields null', async () => {
    const snapshot = await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    expect(snapshot.sprintId).toBe(sprintId);
    expect(snapshot.workstreamId).toBe(workstreamId);
    expect(snapshot.id).toBeDefined();
    expect(snapshot.velocity).toBeNull();
    expect(snapshot.overheadPercent).toBeNull();
    expect(snapshot.predictability).toBeNull();
    expect(snapshot.carryOverRate).toBeNull();
    expect(snapshot.carryOverItems).toBeNull();
    expect(snapshot.carryOverPoints).toBeNull();
    expect(snapshot.plannedPoints).toBeNull();
    expect(snapshot.completedPoints).toBeNull();
    expect(snapshot.overheadHours).toBeNull();
    expect(snapshot.grossHours).toBeNull();
    expect(snapshot.velocityAvg).toBeNull();
    expect(snapshot.overheadPercentAvg).toBeNull();
    expect(snapshot.predictabilityAvg).toBeNull();
    expect(snapshot.carryOverRateAvg).toBeNull();
    expect(snapshot.velocityRag).toBeNull();
    expect(snapshot.overheadRag).toBeNull();
    expect(snapshot.predictabilityRag).toBeNull();
    expect(snapshot.carryOverRag).toBeNull();
    expect(snapshot.computedAt).toBeInstanceOf(Date);
    expect(snapshot.createdAt).toBeInstanceOf(Date);
    expect(snapshot.updatedAt).toBeInstanceOf(Date);
  });

  it('should create with full metric data (velocity, overhead, predictability, carryOver, rolling averages, RAG)', async () => {
    const snapshot = await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
        velocity: 18.5,
        overheadPercent: 12.3,
        predictability: 0.92,
        carryOverRate: 0.15,
        carryOverItems: 3,
        carryOverPoints: 5.5,
        plannedPoints: 25.0,
        completedPoints: 21.0,
        overheadHours: 8.0,
        grossHours: 65.0,
        velocityAvg: 19.2,
        overheadPercentAvg: 11.5,
        predictabilityAvg: 0.88,
        carryOverRateAvg: 0.12,
        velocityRag: 'Green',
        overheadRag: 'Amber',
        predictabilityRag: 'Green',
        carryOverRag: 'Green',
      },
    });

    expect(snapshot.velocity).toBe(18.5);
    expect(snapshot.overheadPercent).toBe(12.3);
    expect(snapshot.predictability).toBe(0.92);
    expect(snapshot.carryOverRate).toBe(0.15);
    expect(snapshot.carryOverItems).toBe(3);
    expect(snapshot.carryOverPoints).toBe(5.5);
    expect(snapshot.plannedPoints).toBe(25.0);
    expect(snapshot.completedPoints).toBe(21.0);
    expect(snapshot.overheadHours).toBe(8.0);
    expect(snapshot.grossHours).toBe(65.0);
    expect(snapshot.velocityAvg).toBe(19.2);
    expect(snapshot.overheadPercentAvg).toBe(11.5);
    expect(snapshot.predictabilityAvg).toBe(0.88);
    expect(snapshot.carryOverRateAvg).toBe(0.12);
    expect(snapshot.velocityRag).toBe('Green');
    expect(snapshot.overheadRag).toBe('Amber');
    expect(snapshot.predictabilityRag).toBe('Green');
    expect(snapshot.carryOverRag).toBe('Green');
  });

  it('should enforce unique constraint on [sprintId, workstreamId]', async () => {
    await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    // Attempting to create a duplicate should fail with P2002 (unique constraint violation)
    await expect(
      prisma.metricSnapshot.create({
        data: {
          sprintId,
          workstreamId,
        },
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('should cascade delete when Sprint is deleted', async () => {
    await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    // Delete the sprint - should cascade to MetricSnapshot
    await prisma.sprint.delete({ where: { id: sprintId } });

    const remaining = await prisma.metricSnapshot.findMany({
      where: { sprintId },
    });

    expect(remaining).toHaveLength(0);
  });

  it('should cascade delete when Workstream is deleted', async () => {
    await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
      },
    });

    // Delete the workstream - should cascade to MetricSnapshot
    await prisma.workstream.delete({ where: { id: workstreamId } });

    const remaining = await prisma.metricSnapshot.findMany({
      where: { workstreamId },
    });

    expect(remaining).toHaveLength(0);
  });

  it('should support upsert behavior (create then update same sprintId+workstreamId)', async () => {
    const created = await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
        velocity: 18.0,
      },
    });

    expect(created.velocity).toBe(18.0);

    const updated = await prisma.metricSnapshot.upsert({
      where: {
        sprintId_workstreamId: { sprintId, workstreamId },
      },
      create: {
        sprintId,
        workstreamId,
        velocity: 20.0,
      },
      update: {
        velocity: 22.5,
        overheadPercent: 10.0,
      },
    });

    expect(updated.id).toBe(created.id);
    expect(updated.velocity).toBe(22.5);
    expect(updated.overheadPercent).toBe(10.0);

    const count = await prisma.metricSnapshot.count({
      where: { sprintId, workstreamId },
    });
    expect(count).toBe(1);
  });

  it('should efficiently query by sprintId via index', async () => {
    const workstream2 = await prisma.workstream.create({
      data: {
        name: 'Mobile',
        adoAreaPath: 'Project\\Mobile',
      },
    });

    await prisma.metricSnapshot.create({
      data: { sprintId, workstreamId, velocity: 18.0 },
    });
    await prisma.metricSnapshot.create({
      data: { sprintId, workstreamId: workstream2.id, velocity: 22.0 },
    });

    // Query by sprintId - should use index
    const snapshots = await prisma.metricSnapshot.findMany({
      where: { sprintId },
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots.map((s) => s.velocity)).toContain(18.0);
    expect(snapshots.map((s) => s.velocity)).toContain(22.0);
  });

  it('should allow navigation from Sprint -> MetricSnapshot[]', async () => {
    await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
        velocity: 18.5,
      },
    });

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { metricSnapshots: true },
    });

    expect(sprint).not.toBeNull();
    expect(sprint!.metricSnapshots).toHaveLength(1);
    expect(sprint!.metricSnapshots[0].velocity).toBe(18.5);
    expect(sprint!.metricSnapshots[0].workstreamId).toBe(workstreamId);
  });

  it('should allow navigation from Workstream -> MetricSnapshot[]', async () => {
    await prisma.metricSnapshot.create({
      data: {
        sprintId,
        workstreamId,
        overheadPercent: 12.3,
      },
    });

    const workstream = await prisma.workstream.findUnique({
      where: { id: workstreamId },
      include: { metricSnapshots: true },
    });

    expect(workstream).not.toBeNull();
    expect(workstream!.metricSnapshots).toHaveLength(1);
    expect(workstream!.metricSnapshots[0].overheadPercent).toBe(12.3);
    expect(workstream!.metricSnapshots[0].sprintId).toBe(sprintId);
  });
});
