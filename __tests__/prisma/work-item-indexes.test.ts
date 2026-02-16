/**
 * @jest-environment node
 */

import { WorkItemType } from '@prisma/client';
import { cleanupTestData, prisma } from './helpers';

describe('WorkItem indexes and constraints', () => {
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
  // AC1/AC5: Unique constraint on adoId
  // ──────────────────────────────────────────────────────────────

  it('should enforce unique constraint on adoId (P2002)', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 50000 }),
    });

    await expect(
      prisma.workItem.create({
        data: validWorkItemData({ adoId: 50000, title: 'Duplicate' }),
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('should allow different adoId values', async () => {
    const wi1 = await prisma.workItem.create({
      data: validWorkItemData({ adoId: 50001 }),
    });

    const wi2 = await prisma.workItem.create({
      data: validWorkItemData({ adoId: 50002, title: 'Another item' }),
    });

    expect(wi1.adoId).toBe(50001);
    expect(wi2.adoId).toBe(50002);
  });

  // ──────────────────────────────────────────────────────────────
  // AC5: Composite index on [workstreamId, sprintId]
  //   Verifies that queries filtered by both fields work efficiently
  // ──────────────────────────────────────────────────────────────

  it('should support efficient queries by workstreamId and sprintId (composite index)', async () => {
    const ws1 = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });

    const ws2 = await prisma.workstream.create({
      data: { name: 'Pitch Tracker', adoAreaPath: 'Project\\Pitch Tracker' },
    });

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-14'),
      },
    });

    // Create work items across different workstreams
    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 301,
        workstreamId: ws1.id,
        sprintId: sprint.id,
      }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 302,
        workstreamId: ws1.id,
        sprintId: sprint.id,
        title: 'Second item',
      }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 303,
        workstreamId: ws2.id,
        sprintId: sprint.id,
        title: 'Different workstream',
      }),
    });

    // Query by workstream + sprint should use the composite index
    const ws1Items = await prisma.workItem.findMany({
      where: {
        workstreamId: ws1.id,
        sprintId: sprint.id,
      },
    });

    expect(ws1Items).toHaveLength(2);
    expect(ws1Items.every((wi) => wi.workstreamId === ws1.id)).toBe(true);
    expect(ws1Items.every((wi) => wi.sprintId === sprint.id)).toBe(true);

    const ws2Items = await prisma.workItem.findMany({
      where: {
        workstreamId: ws2.id,
        sprintId: sprint.id,
      },
    });

    expect(ws2Items).toHaveLength(1);
    expect(ws2Items[0].adoId).toBe(303);
  });

  // ──────────────────────────────────────────────────────────────
  // AC5: Index on type
  //   Verifies that filtering by work item type works
  // ──────────────────────────────────────────────────────────────

  it('should support efficient queries by type (type index)', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 401, type: 'Bug' as WorkItemType, title: 'Bug 1' }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 402, type: 'Bug' as WorkItemType, title: 'Bug 2' }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 403,
        type: 'UserStory' as WorkItemType,
        title: 'Story 1',
      }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({ adoId: 404, type: 'Spike' as WorkItemType, title: 'Spike 1' }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 405,
        type: 'Support' as WorkItemType,
        title: 'Support 1',
      }),
    });

    // Filter by Bug type (uses type index)
    const bugs = await prisma.workItem.findMany({
      where: { type: 'Bug' },
    });
    expect(bugs).toHaveLength(2);

    // Filter by multiple types for overhead calculation
    const overheadItems = await prisma.workItem.findMany({
      where: {
        type: { in: ['Bug', 'Spike', 'Support'] },
      },
    });
    expect(overheadItems).toHaveLength(4);

    // Filter UserStory for velocity calculation
    const stories = await prisma.workItem.findMany({
      where: { type: 'UserStory' },
    });
    expect(stories).toHaveLength(1);
  });

  // ──────────────────────────────────────────────────────────────
  // AC5: Index on iterationPath
  //   Verifies that filtering by iterationPath works
  // ──────────────────────────────────────────────────────────────

  it('should support efficient queries by iterationPath (iterationPath index)', async () => {
    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 501,
        iterationPath: 'Project\\Q4 FY26\\Sprint 1',
      }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 502,
        iterationPath: 'Project\\Q4 FY26\\Sprint 1',
        title: 'Another Sprint 1 item',
      }),
    });

    await prisma.workItem.create({
      data: validWorkItemData({
        adoId: 503,
        iterationPath: 'Project\\Q4 FY26\\Sprint 2',
        title: 'Sprint 2 item',
      }),
    });

    // Query by iterationPath (uses iterationPath index)
    const sprint1Items = await prisma.workItem.findMany({
      where: { iterationPath: 'Project\\Q4 FY26\\Sprint 1' },
    });
    expect(sprint1Items).toHaveLength(2);

    const sprint2Items = await prisma.workItem.findMany({
      where: { iterationPath: 'Project\\Q4 FY26\\Sprint 2' },
    });
    expect(sprint2Items).toHaveLength(1);
  });

  // ──────────────────────────────────────────────────────────────
  // Verify indexes exist via raw SQL introspection
  // ──────────────────────────────────────────────────────────────

  it('should have unique index on adoId column', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'work_items'
      AND indexname LIKE '%adoId%';
    `;

    expect(indexes.length).toBeGreaterThanOrEqual(1);
    // Verify it is a UNIQUE index
    expect(indexes[0].indexdef).toContain('UNIQUE');
  });

  it('should have composite index on [workstreamId, sprintId]', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'work_items'
      AND indexname LIKE '%workstreamId_sprintId%';
    `;

    expect(indexes.length).toBeGreaterThanOrEqual(1);
  });

  it('should have index on type column', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'work_items'
      AND indexname LIKE '%type_idx%';
    `;

    expect(indexes.length).toBeGreaterThanOrEqual(1);
  });

  it('should have index on iterationPath column', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'work_items'
      AND indexname LIKE '%iterationPath%';
    `;

    expect(indexes.length).toBeGreaterThanOrEqual(1);
  });
});
