/**
 * @jest-environment node
 */

import { MilestoneStatus } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('Milestone model', () => {
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

  // Helper to create a valid Milestone with minimal required fields
  function validMilestoneData(overrides: Record<string, unknown> = {}) {
    return {
      title: 'Q1 Release',
      workstreamId,
      targetMonth: new Date('2026-03-01'),
      ...overrides,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // Basic creation with required fields
  // ──────────────────────────────────────────────────────────────

  it('should create a Milestone with required fields', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData({ status: 'InProgress' as MilestoneStatus }),
    });

    expect(milestone.title).toBe('Q1 Release');
    expect(milestone.workstreamId).toBe(workstreamId);
    expect(milestone.targetMonth).toEqual(new Date('2026-03-01'));
    expect(milestone.status).toBe('InProgress');
  });

  // ──────────────────────────────────────────────────────────────
  // Auto-generated CUID ID
  // ──────────────────────────────────────────────────────────────

  it('should auto-generate a CUID ID', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData(),
    });

    expect(milestone.id).toBeDefined();
    expect(typeof milestone.id).toBe('string');
    expect(milestone.id.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────
  // Auto-set timestamps
  // ──────────────────────────────────────────────────────────────

  it('should auto-set createdAt and updatedAt timestamps', async () => {
    const before = new Date();

    const milestone = await prisma.milestone.create({
      data: validMilestoneData(),
    });

    const after = new Date();

    expect(milestone.createdAt).toBeInstanceOf(Date);
    expect(milestone.updatedAt).toBeInstanceOf(Date);
    expect(milestone.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(milestone.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  // ──────────────────────────────────────────────────────────────
  // Default status is NotStarted
  // ──────────────────────────────────────────────────────────────

  it('should default status to NotStarted when not specified', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData(),
    });

    expect(milestone.status).toBe('NotStarted');
  });

  // ──────────────────────────────────────────────────────────────
  // Nullable fields
  // ──────────────────────────────────────────────────────────────

  it('should default nullable fields to null', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData(),
    });

    expect(milestone.adoFeatureId).toBeNull();
    expect(milestone.notes).toBeNull();
  });

  it('should accept adoFeatureId as null for manual milestones', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData({ adoFeatureId: null }),
    });

    expect(milestone.adoFeatureId).toBeNull();
  });

  it('should accept adoFeatureId as Int for ADO-linked milestones', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData({ adoFeatureId: 54321 }),
    });

    expect(milestone.adoFeatureId).toBe(54321);
  });

  it('should accept notes when provided', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData({ notes: 'On track for March delivery' }),
    });

    expect(milestone.notes).toBe('On track for March delivery');
  });

  // ──────────────────────────────────────────────────────────────
  // Required fields validation
  // ──────────────────────────────────────────────────────────────

  it('should require title field', async () => {
    await expect(
      prisma.milestone.create({
        data: validMilestoneData({ title: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require workstreamId field', async () => {
    await expect(
      prisma.milestone.create({
        data: validMilestoneData({ workstreamId: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require targetMonth field', async () => {
    await expect(
      prisma.milestone.create({
        data: validMilestoneData({ targetMonth: undefined }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // All optional fields together
  // ──────────────────────────────────────────────────────────────

  it('should accept all optional fields when provided', async () => {
    const milestone = await prisma.milestone.create({
      data: validMilestoneData({
        adoFeatureId: 98765,
        status: 'Done' as MilestoneStatus,
        notes: 'Completed ahead of schedule',
      }),
    });

    expect(milestone.adoFeatureId).toBe(98765);
    expect(milestone.status).toBe('Done');
    expect(milestone.notes).toBe('Completed ahead of schedule');
  });
});
