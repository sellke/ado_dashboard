/**
 * @jest-environment node
 */

import { WorkItemType } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('WorkItem model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper to create a valid WorkItem with minimal required fields
  function validWorkItemData(overrides: Record<string, unknown> = {}) {
    return {
      adoId: 12345,
      type: 'UserStory' as WorkItemType,
      title: 'Implement login page',
      state: 'Active',
      areaPath: 'Project\\Platform',
      iterationPath: 'Project\\Sprint 1',
      ...overrides,
    };
  }

  // ──────────────────────────────────────────────────────────────
  // AC1: Basic creation, CUID ID, timestamps, unique adoId
  // ──────────────────────────────────────────────────────────────

  it('should create a WorkItem with adoId, type, state, and required fields', async () => {
    const wi = await prisma.workItem.create({
      data: validWorkItemData(),
    });

    expect(wi.adoId).toBe(12345);
    expect(wi.type).toBe('UserStory');
    expect(wi.title).toBe('Implement login page');
    expect(wi.state).toBe('Active');
    expect(wi.areaPath).toBe('Project\\Platform');
    expect(wi.iterationPath).toBe('Project\\Sprint 1');
  });

  it('should auto-generate a CUID ID', async () => {
    const wi = await prisma.workItem.create({
      data: validWorkItemData(),
    });

    expect(wi.id).toBeDefined();
    expect(typeof wi.id).toBe('string');
    expect(wi.id.length).toBeGreaterThan(0);
  });

  it('should auto-set createdAt and updatedAt timestamps', async () => {
    const before = new Date();

    const wi = await prisma.workItem.create({
      data: validWorkItemData(),
    });

    const after = new Date();

    expect(wi.createdAt).toBeInstanceOf(Date);
    expect(wi.updatedAt).toBeInstanceOf(Date);
    expect(wi.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(wi.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should enforce unique constraint on adoId', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 99999 }),
    });

    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ adoId: 99999, title: 'Duplicate ADO item' }),
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  // ──────────────────────────────────────────────────────────────
  // AC2: WorkItemType enum values
  // ──────────────────────────────────────────────────────────────

  const allWorkItemTypes: WorkItemType[] = [
    'Epic',
    'Feature',
    'UserStory',
    'Task',
    'Bug',
    'Spike',
    'Support',
  ];

  it.each(allWorkItemTypes)('should accept WorkItemType enum value: %s', async (type) => {
    const wi = await prisma.workItem.create({
      data: validWorkItemData({
        adoId: allWorkItemTypes.indexOf(type) + 1000,
        type,
      }),
    });

    expect(wi.type).toBe(type);
  });

  it('should reject invalid WorkItemType enum value', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ type: 'InvalidType' as WorkItemType }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // AC4: parentAdoId field
  // ──────────────────────────────────────────────────────────────

  it('should allow null parentAdoId', async () => {
    const wi = await prisma.workItem.create({
      data: validWorkItemData(),
    });

    expect(wi.parentAdoId).toBeNull();
  });

  it('should store parentAdoId as nullable Int for ADO hierarchy', async () => {
    const parent = await prisma.workItem.create({
      data: validWorkItemData({ adoId: 100, type: 'Epic' as WorkItemType }),
    });

    const child = await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 200,
        type: 'Feature' as WorkItemType,
        parentAdoId: parent.adoId,
      }),
    });

    expect(child.parentAdoId).toBe(100);
  });

  // ──────────────────────────────────────────────────────────────
  // Nullable fields
  // ──────────────────────────────────────────────────────────────

  it('should default nullable fields to null', async () => {
    const wi = await prisma.workItem.create({
      data: validWorkItemData(),
    });

    expect(wi.adoRevision).toBeNull();
    expect(wi.storyPoints).toBeNull();
    expect(wi.originalEstimate).toBeNull();
    expect(wi.completedWork).toBeNull();
    expect(wi.remainingWork).toBeNull();
    expect(wi.parentAdoId).toBeNull();
    expect(wi.assignedTo).toBeNull();
    expect(wi.tags).toBeNull();
    expect(wi.adoCreatedDate).toBeNull();
    expect(wi.adoChangedDate).toBeNull();
    expect(wi.adoActivatedDate).toBeNull();
    expect(wi.adoClosedDate).toBeNull();
    expect(wi.workstreamId).toBeNull();
    expect(wi.sprintId).toBeNull();
  });

  it('should accept all optional fields when provided', async () => {
    const now = new Date();

    const wi = await prisma.workItem.create({
      data: validWorkItemData({
        adoRevision: 5,
        storyPoints: 8.0,
        originalEstimate: 16.0,
        completedWork: 12.5,
        remainingWork: 3.5,
        parentAdoId: 42,
        assignedTo: 'John Doe',
        tags: 'Backend,API',
        adoCreatedDate: now,
        adoChangedDate: now,
        adoActivatedDate: now,
        adoClosedDate: now,
      }),
    });

    expect(wi.adoRevision).toBe(5);
    expect(wi.storyPoints).toBe(8.0);
    expect(wi.originalEstimate).toBe(16.0);
    expect(wi.completedWork).toBe(12.5);
    expect(wi.remainingWork).toBe(3.5);
    expect(wi.parentAdoId).toBe(42);
    expect(wi.assignedTo).toBe('John Doe');
    expect(wi.tags).toBe('Backend,API');
    expect(wi.adoCreatedDate).toEqual(now);
    expect(wi.adoChangedDate).toEqual(now);
    expect(wi.adoActivatedDate).toEqual(now);
    expect(wi.adoClosedDate).toEqual(now);
  });

  // ──────────────────────────────────────────────────────────────
  // Required fields validation
  // ──────────────────────────────────────────────────────────────

  it('should require adoId field', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ adoId: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require type field', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ type: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require title field', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ title: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require state field', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ state: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require areaPath field', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ areaPath: undefined }),
      })
    ).rejects.toThrow();
  });

  it('should require iterationPath field', async () => {
    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ iterationPath: undefined }),
      })
    ).rejects.toThrow();
  });

  // ──────────────────────────────────────────────────────────────
  // AC3: Nullable foreign keys (workstreamId, sprintId)
  // ──────────────────────────────────────────────────────────────

  it('should allow null workstreamId and sprintId', async () => {
    const wi = await prisma.workItem.create({
      data: validWorkItemData(),
    });

    expect(wi.workstreamId).toBeNull();
    expect(wi.sprintId).toBeNull();
  });

  it('should accept workstreamId when provided', async () => {
    const workstream = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });

    const wi = await prisma.workItem.create({
      data: validWorkItemData({ workstreamId: workstream.id }),
    });

    expect(wi.workstreamId).toBe(workstream.id);
  });

  it('should accept sprintId when provided', async () => {
    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    const wi = await prisma.workItem.create({
      data: validWorkItemData({ sprintId: sprint.id }),
    });

    expect(wi.sprintId).toBe(sprint.id);
  });

  it('should accept both workstreamId and sprintId when provided', async () => {
    const workstream = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    const wi = await prisma.workItem.create({
      data: validWorkItemData({
        workstreamId: workstream.id,
        sprintId: sprint.id,
      }),
    });

    expect(wi.workstreamId).toBe(workstream.id);
    expect(wi.sprintId).toBe(sprint.id);
  });
});
