/**
 * @jest-environment node
 */

import { WorkItemType } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('WorkItem relationships', () => {
  let workstreamId: string;
  let sprintId: string;

  beforeEach(async () => {
    const workstream = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });
    workstreamId = workstream.id;

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });
    sprintId = sprint.id;
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

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
  // AC3: Navigation from WorkItem → Workstream
  // ──────────────────────────────────────────────────────────────

  it('should navigate from WorkItem to Workstream', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ workstreamId }),
    });

    const wi = await prisma.workItem.findFirst({
      where: { adoId: 12345 },
      include: { workstream: true },
    });

    expect(wi).not.toBeNull();
    expect(wi!.workstream).not.toBeNull();
    expect(wi!.workstream!.name).toBe('Streams');
    expect(wi!.workstream!.adoAreaPath).toBe('Project\\Streams');
  });

  // ──────────────────────────────────────────────────────────────
  // AC3: Navigation from WorkItem → Sprint
  // ──────────────────────────────────────────────────────────────

  it('should navigate from WorkItem to Sprint', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ sprintId }),
    });

    const wi = await prisma.workItem.findFirst({
      where: { adoId: 12345 },
      include: { sprint: true },
    });

    expect(wi).not.toBeNull();
    expect(wi!.sprint).not.toBeNull();
    expect(wi!.sprint!.name).toBe('Sprint 1');
    expect(wi!.sprint!.startDate).toEqual(new Date('2026-01-01'));
  });

  // ──────────────────────────────────────────────────────────────
  // AC3: Navigation from Workstream → WorkItems
  // ──────────────────────────────────────────────────────────────

  it('should navigate from Workstream to WorkItems', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 101, workstreamId }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 102,
        type: 'Bug' as WorkItemType,
        title: 'Fix login bug',
        workstreamId,
      }),
    });

    const workstream = await prisma.workstream.findUnique({
      where: { id: workstreamId },
      include: { workItems: true },
    });

    expect(workstream).not.toBeNull();
    expect(workstream!.workItems).toHaveLength(2);
    expect(workstream!.workItems.map((wi) => wi.adoId).sort()).toEqual([101, 102]);
  });

  // ──────────────────────────────────────────────────────────────
  // AC3: Navigation from Sprint → WorkItems
  // ──────────────────────────────────────────────────────────────

  it('should navigate from Sprint to WorkItems', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 201, sprintId }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 202,
        type: 'Task' as WorkItemType,
        title: 'Setup environment',
        sprintId,
      }),
    });

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { workItems: true },
    });

    expect(sprint).not.toBeNull();
    expect(sprint!.workItems).toHaveLength(2);
    expect(sprint!.workItems.map((wi) => wi.adoId).sort()).toEqual([201, 202]);
  });

  // ──────────────────────────────────────────────────────────────
  // Nullable FK behavior: WorkItem without Workstream/Sprint
  // ──────────────────────────────────────────────────────────────

  it('should return null workstream when workstreamId is null', async () => {
    await prisma.workItem.create({
      data: validWorkItemData(),
    });

    const wi = await prisma.workItem.findFirst({
      where: { adoId: 12345 },
      include: { workstream: true },
    });

    expect(wi).not.toBeNull();
    expect(wi!.workstream).toBeNull();
  });

  it('should return null sprint when sprintId is null', async () => {
    await prisma.workItem.create({
      data: validWorkItemData(),
    });

    const wi = await prisma.workItem.findFirst({
      where: { adoId: 12345 },
      include: { sprint: true },
    });

    expect(wi).not.toBeNull();
    expect(wi!.sprint).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // onDelete: SetNull behavior
  // ──────────────────────────────────────────────────────────────

  it('should set workstreamId to null when Workstream is deleted (SetNull)', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ workstreamId }),
    });

    // Delete the workstream - should SetNull on WorkItem
    await prisma.workstream.delete({ where: { id: workstreamId } });

    const wi = await prisma.workItem.findFirst({
      where: { adoId: 12345 },
    });

    expect(wi).not.toBeNull();
    expect(wi!.workstreamId).toBeNull();
  });

  it('should set sprintId to null when Sprint is deleted (SetNull)', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ sprintId }),
    });

    // Delete the sprint - should SetNull on WorkItem
    await prisma.sprint.delete({ where: { id: sprintId } });

    const wi = await prisma.workItem.findFirst({
      where: { adoId: 12345 },
    });

    expect(wi).not.toBeNull();
    expect(wi!.sprintId).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────
  // ADO hierarchy queries via parentAdoId
  // ──────────────────────────────────────────────────────────────

  it('should support ADO hierarchy queries via parentAdoId (Epic → Feature → UserStory → Task)', async () => {
    // Create a hierarchy: Epic → Feature → UserStory → Task
    const epic = await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 1,
        type: 'Epic' as WorkItemType,
        title: 'Platform Epic',
        parentAdoId: null,
      }),
    });

    const feature = await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 2,
        type: 'Feature' as WorkItemType,
        title: 'Login Feature',
        parentAdoId: epic.adoId,
      }),
    });

    const story = await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 3,
        type: 'UserStory' as WorkItemType,
        title: 'Login Page',
        parentAdoId: feature.adoId,
      }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 4,
        type: 'Task' as WorkItemType,
        title: 'Create form component',
        parentAdoId: story.adoId,
      }),
    });

    // Query children of the epic
    const epicChildren = await prisma.workItem.findMany({
      where: { parentAdoId: epic.adoId },
    });
    expect(epicChildren).toHaveLength(1);
    expect(epicChildren[0].adoId).toBe(2);

    // Query children of the feature
    const featureChildren = await prisma.workItem.findMany({
      where: { parentAdoId: feature.adoId },
    });
    expect(featureChildren).toHaveLength(1);
    expect(featureChildren[0].adoId).toBe(3);

    // Query children of the user story
    const storyChildren = await prisma.workItem.findMany({
      where: { parentAdoId: story.adoId },
    });
    expect(storyChildren).toHaveLength(1);
    expect(storyChildren[0].adoId).toBe(4);

    // Query root items (no parent)
    const rootItems = await prisma.workItem.findMany({
      where: { parentAdoId: null },
    });
    expect(rootItems).toHaveLength(1);
    expect(rootItems[0].adoId).toBe(1);
  });
});
