/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('Milestone-Workstream relationship', () => {
  let workstreamId: string;

  beforeEach(async () => {
    // Create prerequisite Workstream for each test
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

  // ──────────────────────────────────────────────────────────────
  // Navigation: Milestone → Workstream
  // ──────────────────────────────────────────────────────────────

  it('should navigate from Milestone to its Workstream', async () => {
    const milestone = await prisma.milestone.create({
      data: {
        title: 'Q1 Release',
        workstreamId,
        targetMonth: new Date('2026-03-01'),
      },
    });

    const result = await prisma.milestone.findUnique({
      where: { id: milestone.id },
      include: { workstream: true },
    });

    expect(result).not.toBeNull();
    expect(result!.workstream).not.toBeNull();
    expect(result!.workstream.id).toBe(workstreamId);
    expect(result!.workstream.name).toBe('Platform');
    expect(result!.workstream.adoAreaPath).toBe('Project\\Platform');
  });

  // ──────────────────────────────────────────────────────────────
  // Navigation: Workstream → Milestone[]
  // ──────────────────────────────────────────────────────────────

  it('should navigate from Workstream to its Milestones', async () => {
    await prisma.milestone.create({
      data: {
        title: 'Q1 Release',
        workstreamId,
        targetMonth: new Date('2026-03-01'),
      },
    });

    const result = await prisma.workstream.findUnique({
      where: { id: workstreamId },
      include: { milestones: true },
    });

    expect(result).not.toBeNull();
    expect(result!.milestones).toHaveLength(1);
    expect(result!.milestones[0].title).toBe('Q1 Release');
  });

  // ──────────────────────────────────────────────────────────────
  // Multiple milestones per workstream
  // ──────────────────────────────────────────────────────────────

  it('should support multiple milestones per workstream', async () => {
    await prisma.milestone.createMany({
      data: [
        {
          title: 'Q1 Release',
          workstreamId,
          targetMonth: new Date('2026-03-01'),
        },
        {
          title: 'Q2 Release',
          workstreamId,
          targetMonth: new Date('2026-06-01'),
        },
        {
          title: 'Q3 Release',
          workstreamId,
          targetMonth: new Date('2026-09-01'),
        },
      ],
    });

    const result = await prisma.workstream.findUnique({
      where: { id: workstreamId },
      include: { milestones: true },
    });

    expect(result).not.toBeNull();
    expect(result!.milestones).toHaveLength(3);

    const titles = result!.milestones.map((m) => m.title).sort();
    expect(titles).toEqual(['Q1 Release', 'Q2 Release', 'Q3 Release']);
  });

  // ──────────────────────────────────────────────────────────────
  // Cascade delete: Workstream → Milestones
  // ──────────────────────────────────────────────────────────────

  it('should cascade delete milestones when Workstream is deleted', async () => {
    const milestone = await prisma.milestone.create({
      data: {
        title: 'Q1 Release',
        workstreamId,
        targetMonth: new Date('2026-03-01'),
      },
    });

    // Delete the workstream - should cascade to milestones
    await prisma.workstream.delete({ where: { id: workstreamId } });

    const remaining = await prisma.milestone.findUnique({
      where: { id: milestone.id },
    });

    expect(remaining).toBeNull();
  });

  it('should cascade delete multiple milestones when Workstream is deleted', async () => {
    await prisma.milestone.createMany({
      data: [
        {
          title: 'Q1 Release',
          workstreamId,
          targetMonth: new Date('2026-03-01'),
        },
        {
          title: 'Q2 Release',
          workstreamId,
          targetMonth: new Date('2026-06-01'),
        },
      ],
    });

    // Delete the workstream - should cascade to all milestones
    await prisma.workstream.delete({ where: { id: workstreamId } });

    const remaining = await prisma.milestone.findMany({
      where: { workstreamId },
    });

    expect(remaining).toHaveLength(0);
  });

  // ──────────────────────────────────────────────────────────────
  // Foreign key constraint
  // ──────────────────────────────────────────────────────────────

  it('should reject creating Milestone with non-existent workstreamId', async () => {
    await expect(
      prisma.milestone.create({
        data: {
          title: 'Orphan Milestone',
          workstreamId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
          targetMonth: new Date('2026-03-01'),
        },
      })
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
