/**
 * @jest-environment node
 *
 * Tests for Story 3: work item ingestion and type mapping.
 *
 * Unit tests:
 * - Type mapping (ADO string → Prisma enum)
 * - Approved-type filter
 * - Full field mapping (mapAdoWorkItem)
 * - WIQL query builder
 * - Workstream resolution by area path
 * - Sprint resolution by iteration path
 *
 * Integration tests (against test DB):
 * - Upsert by adoId (create + update)
 * - Revision-aware update (skip when revision unchanged)
 * - Idempotency across multiple runs
 * - Workstream and sprint linkage
 * - syncWorkItemsForWorkstream with mocked ADO fetchers
 * - Skipped-type counting in diagnostics
 */

import {
  APPROVED_TYPES,
  isApprovedType,
  mapAdoWorkItem,
  mapAdoWorkItemType,
  type AdoWorkItemFields,
  type AdoWorkItemRaw,
} from '@/lib/sync/mappers';
import type { MappedWorkItem } from '@/lib/sync/mappers';
import {
  buildWorkItemWiql,
  resolveSprintId,
  resolveWorkstreamId,
  syncWorkItemsForWorkstream,
  upsertWorkItems,
  type WorkItemSyncContext,
} from '@/lib/sync/work-items';
import { cleanupTestData, prisma } from '../../prisma/helpers';

// =============================================================================
// UNIT TESTS: Type Mapping
// =============================================================================

describe('mapAdoWorkItemType', () => {
  it('should map "Feature" to Feature', () => {
    expect(mapAdoWorkItemType('Feature')).toBe('Feature');
  });

  it('should map "User Story" to UserStory', () => {
    expect(mapAdoWorkItemType('User Story')).toBe('UserStory');
  });

  it('should map "Bug" to Bug', () => {
    expect(mapAdoWorkItemType('Bug')).toBe('Bug');
  });

  it('should map "Spike" to Spike', () => {
    expect(mapAdoWorkItemType('Spike')).toBe('Spike');
  });

  it('should map "Support" to Support', () => {
    expect(mapAdoWorkItemType('Support')).toBe('Support');
  });

  it('should return undefined for "Task"', () => {
    expect(mapAdoWorkItemType('Task')).toBeUndefined();
  });

  it('should return undefined for "Epic"', () => {
    expect(mapAdoWorkItemType('Epic')).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    expect(mapAdoWorkItemType('')).toBeUndefined();
  });

  it('should return undefined for unknown types', () => {
    expect(mapAdoWorkItemType('Issue')).toBeUndefined();
    expect(mapAdoWorkItemType('Test Case')).toBeUndefined();
  });
});

describe('isApprovedType', () => {
  it('should return true for all approved types', () => {
    expect(isApprovedType('Feature')).toBe(true);
    expect(isApprovedType('User Story')).toBe(true);
    expect(isApprovedType('Bug')).toBe(true);
    expect(isApprovedType('Spike')).toBe(true);
    expect(isApprovedType('Support')).toBe(true);
  });

  it('should return false for unapproved types', () => {
    expect(isApprovedType('Task')).toBe(false);
    expect(isApprovedType('Epic')).toBe(false);
    expect(isApprovedType('Test Case')).toBe(false);
  });
});

describe('APPROVED_TYPES', () => {
  it('should contain exactly 5 types', () => {
    expect(APPROVED_TYPES).toHaveLength(5);
  });

  it('should contain Feature, User Story, Bug, Spike, Support', () => {
    expect(APPROVED_TYPES).toEqual(
      expect.arrayContaining(['Feature', 'User Story', 'Bug', 'Spike', 'Support'])
    );
  });
});

// =============================================================================
// UNIT TESTS: Field Mapping (mapAdoWorkItem)
// =============================================================================

describe('mapAdoWorkItem', () => {
  const validFields: AdoWorkItemFields = {
    'System.Id': 42,
    'System.Rev': 5,
    'System.WorkItemType': 'User Story',
    'System.Title': 'Implement login page',
    'System.State': 'Active',
    'Microsoft.VSTS.Scheduling.StoryPoints': 3,
    'Microsoft.VSTS.Scheduling.OriginalEstimate': 8,
    'Microsoft.VSTS.Scheduling.CompletedWork': 4,
    'Microsoft.VSTS.Scheduling.RemainingWork': 4,
    'System.AreaPath': 'Project\\App\\Team\\Streams',
    'System.IterationPath': 'Project\\FY26\\Q4\\Sprint 26.21',
    'System.Parent': 100,
    'System.AssignedTo': 'Jane Doe',
    'System.Tags': 'frontend; high-priority',
    'System.CreatedDate': '2026-01-15T10:00:00Z',
    'System.ChangedDate': '2026-02-01T14:30:00Z',
  };

  it('should map all fields correctly for a valid User Story', () => {
    const result = mapAdoWorkItem(validFields);
    expect(result).not.toBeNull();
    expect(result!.adoId).toBe(42);
    expect(result!.adoRevision).toBe(5);
    expect(result!.type).toBe('UserStory');
    expect(result!.title).toBe('Implement login page');
    expect(result!.state).toBe('Active');
    expect(result!.storyPoints).toBe(3);
    expect(result!.originalEstimate).toBe(8);
    expect(result!.completedWork).toBe(4);
    expect(result!.remainingWork).toBe(4);
    expect(result!.areaPath).toBe('Project\\App\\Team\\Streams');
    expect(result!.iterationPath).toBe('Project\\FY26\\Q4\\Sprint 26.21');
    expect(result!.parentAdoId).toBe(100);
    expect(result!.assignedTo).toBe('Jane Doe');
    expect(result!.tags).toBe('frontend; high-priority');
    expect(result!.adoCreatedDate).toEqual(new Date('2026-01-15T10:00:00Z'));
    expect(result!.adoChangedDate).toEqual(new Date('2026-02-01T14:30:00Z'));
  });

  it('should handle AssignedTo as identity object', () => {
    const fields: AdoWorkItemFields = {
      ...validFields,
      'System.AssignedTo': { displayName: 'John Smith', uniqueName: 'jsmith@company.com' },
    };
    const result = mapAdoWorkItem(fields);
    expect(result!.assignedTo).toBe('John Smith');
  });

  it('should fall back to uniqueName when displayName is missing', () => {
    const fields: AdoWorkItemFields = {
      ...validFields,
      'System.AssignedTo': { uniqueName: 'jsmith@company.com' },
    };
    const result = mapAdoWorkItem(fields);
    expect(result!.assignedTo).toBe('jsmith@company.com');
  });

  it('should return null for unsupported work item type', () => {
    const fields: AdoWorkItemFields = {
      ...validFields,
      'System.WorkItemType': 'Task',
    };
    expect(mapAdoWorkItem(fields)).toBeNull();
  });

  it('should return null when System.WorkItemType is missing', () => {
    const fields: AdoWorkItemFields = {
      'System.Id': 42,
      'System.Title': 'No type',
    };
    expect(mapAdoWorkItem(fields)).toBeNull();
  });

  it('should return null when System.Id is missing', () => {
    const fields: AdoWorkItemFields = {
      'System.WorkItemType': 'Bug',
      'System.Title': 'No ID',
    };
    expect(mapAdoWorkItem(fields)).toBeNull();
  });

  it('should return null when System.Title is missing', () => {
    const fields: AdoWorkItemFields = {
      'System.Id': 42,
      'System.WorkItemType': 'Bug',
    };
    expect(mapAdoWorkItem(fields)).toBeNull();
  });

  it('should default optional numeric fields to null', () => {
    const fields: AdoWorkItemFields = {
      'System.Id': 42,
      'System.WorkItemType': 'Bug',
      'System.Title': 'Minimal bug',
    };
    const result = mapAdoWorkItem(fields);
    expect(result).not.toBeNull();
    expect(result!.storyPoints).toBeNull();
    expect(result!.originalEstimate).toBeNull();
    expect(result!.completedWork).toBeNull();
    expect(result!.remainingWork).toBeNull();
    expect(result!.parentAdoId).toBeNull();
    expect(result!.assignedTo).toBeNull();
    expect(result!.tags).toBeNull();
    expect(result!.adoCreatedDate).toBeNull();
    expect(result!.adoChangedDate).toBeNull();
  });

  it('should default adoRevision to 0 when not provided', () => {
    const fields: AdoWorkItemFields = {
      'System.Id': 42,
      'System.WorkItemType': 'Feature',
      'System.Title': 'No revision',
    };
    const result = mapAdoWorkItem(fields);
    expect(result!.adoRevision).toBe(0);
  });

  it('should default state to "Unknown" when not provided', () => {
    const fields: AdoWorkItemFields = {
      'System.Id': 42,
      'System.WorkItemType': 'Feature',
      'System.Title': 'No state',
    };
    const result = mapAdoWorkItem(fields);
    expect(result!.state).toBe('Unknown');
  });
});

// =============================================================================
// UNIT TESTS: WIQL Query Builder
// =============================================================================

describe('buildWorkItemWiql', () => {
  it('should build a valid WIQL query with area path and iteration paths', () => {
    const query = buildWorkItemWiql('Project\\App\\Team', [
      'Project\\FY26\\Q4\\Sprint 1',
      'Project\\FY26\\Q4\\Sprint 2',
    ]);
    expect(query).toContain("UNDER 'Project\\App\\Team'");
    expect(query).toContain("'Project\\FY26\\Q4\\Sprint 1'");
    expect(query).toContain("'Project\\FY26\\Q4\\Sprint 2'");
    expect(query).toContain('ORDER BY [System.Id]');
  });

  it('should return empty string when no iteration paths provided', () => {
    expect(buildWorkItemWiql('Project\\App\\Team', [])).toBe('');
  });

  it('should escape single quotes in paths', () => {
    const query = buildWorkItemWiql("Project\\App's Team", ["Sprint O'Brien"]);
    expect(query).toContain("UNDER 'Project\\App''s Team'");
    expect(query).toContain("'Sprint O''Brien'");
  });
});

// =============================================================================
// UNIT TESTS: Resolution Helpers
// =============================================================================

describe('resolveWorkstreamId', () => {
  const workstreams = [
    { id: 'ws-1', adoAreaPath: 'Project\\App\\LiveLink\\Streams' },
    { id: 'ws-2', adoAreaPath: 'Project\\App\\LiveLink\\Action Tracker' },
    { id: 'ws-3', adoAreaPath: 'Project\\App\\LiveLink\\Pitch Tracker' },
    { id: 'ws-4', adoAreaPath: 'Project\\App\\LiveLink\\Tier Boards' },
  ];

  it('should resolve exact area path match', () => {
    expect(resolveWorkstreamId('Project\\App\\LiveLink\\Streams', workstreams)).toBe('ws-1');
  });

  it('should resolve child area path (UNDER semantics)', () => {
    expect(resolveWorkstreamId('Project\\App\\LiveLink\\Streams\\SubArea', workstreams)).toBe(
      'ws-1'
    );
  });

  it('should return null when no match found', () => {
    expect(resolveWorkstreamId('Project\\App\\LiveLink\\Unknown', workstreams)).toBeNull();
  });

  it('should return null for empty area path', () => {
    expect(resolveWorkstreamId('', workstreams)).toBeNull();
  });

  it('should not match partial names (only backslash-separated children)', () => {
    // "StreamsSuffix" should NOT match "Streams"
    expect(resolveWorkstreamId('Project\\App\\LiveLink\\StreamsSuffix', workstreams)).toBeNull();
  });
});

describe('resolveSprintId', () => {
  const sprintIdMap = new Map([
    ['Project\\FY26\\Q4\\Sprint 26.21', 'sprint-1'],
    ['Project\\FY26\\Q4\\Sprint 26.22', 'sprint-2'],
  ]);

  it('should resolve exact iteration path match', () => {
    expect(resolveSprintId('Project\\FY26\\Q4\\Sprint 26.21', sprintIdMap)).toBe('sprint-1');
  });

  it('should return null for unmatched path', () => {
    expect(resolveSprintId('Project\\FY26\\Q3\\Sprint 26.15', sprintIdMap)).toBeNull();
  });

  it('should return null for empty path', () => {
    expect(resolveSprintId('', sprintIdMap)).toBeNull();
  });
});

// =============================================================================
// INTEGRATION TESTS: Upsert (against test DB)
// =============================================================================

describe('upsertWorkItems', () => {
  let wsId: string;
  let sprintId: string;
  const areaPath = 'Project\\App\\LiveLink\\Streams';
  const iterationPath = 'Project\\FY26\\Q4\\Sprint 26.21';

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Create workstream and sprint for linkage
    const ws = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: areaPath },
    });
    wsId = ws.id;

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 26.21',
        adoIterationPath: iterationPath,
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-13'),
      },
    });
    sprintId = sprint.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  const workstreams = [{ id: '', adoAreaPath: areaPath }]; // id set in beforeEach
  const sprintIdMap = new Map<string, string>(); // set in beforeEach

  function getWorkstreams() {
    return [{ id: wsId, adoAreaPath: areaPath }];
  }

  function getSprintIdMap() {
    return new Map([[iterationPath, sprintId]]);
  }

  function makeMappedItem(overrides: Partial<MappedWorkItem> = {}): MappedWorkItem {
    return {
      adoId: 1001,
      adoRevision: 1,
      type: 'UserStory',
      title: 'Test story',
      state: 'Active',
      storyPoints: 3,
      originalEstimate: null,
      completedWork: null,
      remainingWork: null,
      areaPath,
      iterationPath,
      parentAdoId: null,
      assignedTo: 'Jane Doe',
      tags: 'test',
      adoCreatedDate: new Date('2026-01-15'),
      adoChangedDate: new Date('2026-02-01'),
      ...overrides,
    };
  }

  it('should create a new work item when adoId does not exist', async () => {
    const items = [makeMappedItem()];
    const result = await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(0);

    const wi = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(wi).not.toBeNull();
    expect(wi!.type).toBe('UserStory');
    expect(wi!.title).toBe('Test story');
    expect(wi!.workstreamId).toBe(wsId);
    expect(wi!.sprintId).toBe(sprintId);
  });

  it('should update work item when adoRevision changes', async () => {
    const items = [makeMappedItem({ adoRevision: 1 })];
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    // Second run with revision bump
    const updatedItems = [
      makeMappedItem({ adoRevision: 2, title: 'Updated title', state: 'Closed' }),
    ];
    const result = await upsertWorkItems(updatedItems, getWorkstreams(), getSprintIdMap(), prisma);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(1);
    expect(result.unchanged).toBe(0);

    const wi = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(wi!.title).toBe('Updated title');
    expect(wi!.state).toBe('Closed');
    expect(wi!.adoRevision).toBe(2);
  });

  it('should skip update when adoRevision is unchanged (idempotent)', async () => {
    const items = [makeMappedItem({ adoRevision: 3 })];
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    // Second run with same revision
    const result = await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.unchanged).toBe(1);
  });

  it('should not create duplicate records across multiple runs', async () => {
    const items = [makeMappedItem()];

    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    const count = await prisma.workItem.count({ where: { adoId: 1001 } });
    expect(count).toBe(1);
  });

  it('should link work item to correct workstream and sprint', async () => {
    const items = [makeMappedItem()];
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    const wi = await prisma.workItem.findUnique({
      where: { adoId: 1001 },
      include: { workstream: true, sprint: true },
    });
    expect(wi!.workstream!.name).toBe('Streams');
    expect(wi!.sprint!.name).toBe('Sprint 26.21');
  });

  it('should set workstreamId to null when area path does not match any workstream', async () => {
    const items = [makeMappedItem({ areaPath: 'Project\\Unknown\\Team' })];
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    const wi = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(wi!.workstreamId).toBeNull();
  });

  it('should set sprintId to null when iteration path does not match any sprint', async () => {
    const items = [makeMappedItem({ iterationPath: 'Project\\FY26\\Q3\\Sprint 26.15' })];
    await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    const wi = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(wi!.sprintId).toBeNull();
  });

  it('should handle multiple items in a single batch', async () => {
    const items = [
      makeMappedItem({ adoId: 2001, type: 'Feature', title: 'Feature 1' }),
      makeMappedItem({ adoId: 2002, type: 'Bug', title: 'Bug 1' }),
      makeMappedItem({ adoId: 2003, type: 'Spike', title: 'Spike 1' }),
    ];
    const result = await upsertWorkItems(items, getWorkstreams(), getSprintIdMap(), prisma);

    expect(result.created).toBe(3);

    const count = await prisma.workItem.count();
    expect(count).toBe(3);
  });

  it('should update workstreamId when area path changes and revision bumps', async () => {
    // Create a second workstream
    const ws2 = await prisma.workstream.create({
      data: { name: 'Action Tracker', adoAreaPath: 'Project\\App\\LiveLink\\Action Tracker' },
    });

    const items = [makeMappedItem({ adoRevision: 1 })];
    await upsertWorkItems(
      items,
      [...getWorkstreams(), { id: ws2.id, adoAreaPath: ws2.adoAreaPath }],
      getSprintIdMap(),
      prisma
    );

    // Move to different workstream
    const movedItems = [
      makeMappedItem({
        adoRevision: 2,
        areaPath: 'Project\\App\\LiveLink\\Action Tracker',
      }),
    ];
    const result = await upsertWorkItems(
      movedItems,
      [...getWorkstreams(), { id: ws2.id, adoAreaPath: ws2.adoAreaPath }],
      getSprintIdMap(),
      prisma
    );

    expect(result.updated).toBe(1);

    const wi = await prisma.workItem.findUnique({ where: { adoId: 1001 } });
    expect(wi!.workstreamId).toBe(ws2.id);
  });
});

// =============================================================================
// INTEGRATION TESTS: syncWorkItemsForWorkstream (with mocked ADO)
// =============================================================================

describe('syncWorkItemsForWorkstream', () => {
  const areaPath = 'Project\\App\\LiveLink\\Streams';
  const iterationPath1 = 'Project\\FY26\\Q4\\Sprint 26.20';
  const iterationPath2 = 'Project\\FY26\\Q4\\Sprint 26.21';

  let wsId: string;
  let sprint1Id: string;
  let sprint2Id: string;

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();

    const ws = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: areaPath },
    });
    wsId = ws.id;

    const s1 = await prisma.sprint.create({
      data: {
        name: 'Sprint 26.20',
        adoIterationPath: iterationPath1,
        startDate: new Date('2026-01-19'),
        endDate: new Date('2026-01-30'),
      },
    });
    sprint1Id = s1.id;

    const s2 = await prisma.sprint.create({
      data: {
        name: 'Sprint 26.21',
        adoIterationPath: iterationPath2,
        startDate: new Date('2026-02-02'),
        endDate: new Date('2026-02-13'),
      },
    });
    sprint2Id = s2.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  /** Create a mock ADO raw item for testing. */
  function makeRawItem(
    id: number,
    type: string,
    title: string,
    iterPath: string = iterationPath2,
    overrides: Partial<AdoWorkItemFields> = {}
  ): AdoWorkItemRaw {
    return {
      id,
      rev: 1,
      fields: {
        'System.Id': id,
        'System.Rev': 1,
        'System.WorkItemType': type,
        'System.Title': title,
        'System.State': 'Active',
        'Microsoft.VSTS.Scheduling.StoryPoints': 3,
        'System.AreaPath': areaPath,
        'System.IterationPath': iterPath,
        'System.AssignedTo': 'Test User',
        ...overrides,
      },
    };
  }

  it('should create work items from ADO data via mocked fetchers', async () => {
    const mockWiqlFetcher = jest.fn().mockResolvedValue([101, 102]);
    const mockBatchFetcher = jest
      .fn()
      .mockResolvedValue([
        makeRawItem(101, 'User Story', 'Story 1'),
        makeRawItem(102, 'Bug', 'Bug 1'),
      ]);

    const context: WorkItemSyncContext = {
      sprintPaths: [iterationPath1, iterationPath2],
      sprintIdMap: new Map([
        [iterationPath1, sprint1Id],
        [iterationPath2, sprint2Id],
      ]),
      db: prisma,
      wiqlFetcher: mockWiqlFetcher,
      batchFetcher: mockBatchFetcher,
    };

    const result = await syncWorkItemsForWorkstream(
      { id: wsId, adoAreaPath: areaPath, name: 'Streams' },
      context
    );

    expect(result.itemsFetched).toBe(2);
    expect(result.itemsCreated).toBe(2);
    expect(result.itemsUpdated).toBe(0);
    expect(result.itemsSkipped).toBe(0);

    const items = await prisma.workItem.findMany({ orderBy: { adoId: 'asc' } });
    expect(items).toHaveLength(2);
    expect(items[0]!.adoId).toBe(101);
    expect(items[0]!.type).toBe('UserStory');
    expect(items[0]!.workstreamId).toBe(wsId);
    expect(items[0]!.sprintId).toBe(sprint2Id);
    expect(items[1]!.adoId).toBe(102);
    expect(items[1]!.type).toBe('Bug');
  });

  it('should skip unsupported types and count them in itemsSkipped', async () => {
    const mockWiqlFetcher = jest.fn().mockResolvedValue([201, 202, 203]);
    const mockBatchFetcher = jest
      .fn()
      .mockResolvedValue([
        makeRawItem(201, 'User Story', 'Story A'),
        makeRawItem(202, 'Task', 'Task should be skipped'),
        makeRawItem(203, 'Epic', 'Epic should be skipped'),
      ]);

    const context: WorkItemSyncContext = {
      sprintPaths: [iterationPath2],
      sprintIdMap: new Map([[iterationPath2, sprint2Id]]),
      db: prisma,
      wiqlFetcher: mockWiqlFetcher,
      batchFetcher: mockBatchFetcher,
    };

    const result = await syncWorkItemsForWorkstream(
      { id: wsId, adoAreaPath: areaPath, name: 'Streams' },
      context
    );

    expect(result.itemsFetched).toBe(3);
    expect(result.itemsCreated).toBe(1);
    expect(result.itemsSkipped).toBe(2);

    const count = await prisma.workItem.count();
    expect(count).toBe(1);
  });

  it('should return zero counters when no sprint paths provided', async () => {
    const result = await syncWorkItemsForWorkstream(
      { id: wsId, adoAreaPath: areaPath, name: 'Streams' },
      {
        sprintPaths: [],
        sprintIdMap: new Map(),
        db: prisma,
        wiqlFetcher: jest.fn(),
        batchFetcher: jest.fn(),
      }
    );

    expect(result.itemsFetched).toBe(0);
    expect(result.itemsCreated).toBe(0);
    expect(result.itemsUpdated).toBe(0);
    expect(result.itemsSkipped).toBe(0);
  });

  it('should return zero counters when WIQL returns no IDs', async () => {
    const result = await syncWorkItemsForWorkstream(
      { id: wsId, adoAreaPath: areaPath, name: 'Streams' },
      {
        sprintPaths: [iterationPath2],
        sprintIdMap: new Map([[iterationPath2, sprint2Id]]),
        db: prisma,
        wiqlFetcher: jest.fn().mockResolvedValue([]),
        batchFetcher: jest.fn(),
      }
    );

    expect(result.itemsFetched).toBe(0);
    expect(result.itemsCreated).toBe(0);
  });

  it('should not create duplicates on re-run with same revision', async () => {
    const rawItems = [makeRawItem(301, 'Feature', 'Feature X')];

    const context: WorkItemSyncContext = {
      sprintPaths: [iterationPath2],
      sprintIdMap: new Map([[iterationPath2, sprint2Id]]),
      db: prisma,
      wiqlFetcher: jest.fn().mockResolvedValue([301]),
      batchFetcher: jest.fn().mockResolvedValue(rawItems),
    };

    const workstream = { id: wsId, adoAreaPath: areaPath, name: 'Streams' };

    const r1 = await syncWorkItemsForWorkstream(workstream, context);
    expect(r1.itemsCreated).toBe(1);

    const r2 = await syncWorkItemsForWorkstream(workstream, context);
    expect(r2.itemsCreated).toBe(0);
    expect(r2.itemsUpdated).toBe(0);

    const count = await prisma.workItem.count({ where: { adoId: 301 } });
    expect(count).toBe(1);
  });

  it('should update work item when revision changes on re-run', async () => {
    const rawItemsV1 = [makeRawItem(401, 'User Story', 'Story V1')];
    const rawItemsV2: AdoWorkItemRaw[] = [
      {
        id: 401,
        rev: 2,
        fields: {
          'System.Id': 401,
          'System.Rev': 2,
          'System.WorkItemType': 'User Story',
          'System.Title': 'Story V2 - Updated',
          'System.State': 'Closed',
          'Microsoft.VSTS.Scheduling.StoryPoints': 5,
          'System.AreaPath': areaPath,
          'System.IterationPath': iterationPath2,
          'System.AssignedTo': 'Test User',
        },
      },
    ];

    const baseContext: WorkItemSyncContext = {
      sprintPaths: [iterationPath2],
      sprintIdMap: new Map([[iterationPath2, sprint2Id]]),
      db: prisma,
      wiqlFetcher: jest.fn().mockResolvedValue([401]),
      batchFetcher: jest.fn().mockResolvedValue(rawItemsV1),
    };

    const workstream = { id: wsId, adoAreaPath: areaPath, name: 'Streams' };

    await syncWorkItemsForWorkstream(workstream, baseContext);

    // Second run with updated item
    const updatedContext: WorkItemSyncContext = {
      ...baseContext,
      batchFetcher: jest.fn().mockResolvedValue(rawItemsV2),
    };

    const r2 = await syncWorkItemsForWorkstream(workstream, updatedContext);
    expect(r2.itemsUpdated).toBe(1);
    expect(r2.itemsCreated).toBe(0);

    const wi = await prisma.workItem.findUnique({ where: { adoId: 401 } });
    expect(wi!.title).toBe('Story V2 - Updated');
    expect(wi!.state).toBe('Closed');
    expect(wi!.adoRevision).toBe(2);
    expect(wi!.storyPoints).toBe(5);
  });

  it('should handle mix of all approved types correctly', async () => {
    const rawItems = [
      makeRawItem(501, 'Feature', 'Feature 1'),
      makeRawItem(502, 'User Story', 'Story 1'),
      makeRawItem(503, 'Bug', 'Bug 1'),
      makeRawItem(504, 'Spike', 'Spike 1'),
      makeRawItem(505, 'Support', 'Support 1'),
    ];

    const context: WorkItemSyncContext = {
      sprintPaths: [iterationPath2],
      sprintIdMap: new Map([[iterationPath2, sprint2Id]]),
      db: prisma,
      wiqlFetcher: jest.fn().mockResolvedValue([501, 502, 503, 504, 505]),
      batchFetcher: jest.fn().mockResolvedValue(rawItems),
    };

    const result = await syncWorkItemsForWorkstream(
      { id: wsId, adoAreaPath: areaPath, name: 'Streams' },
      context
    );

    expect(result.itemsFetched).toBe(5);
    expect(result.itemsCreated).toBe(5);
    expect(result.itemsSkipped).toBe(0);

    const types = await prisma.workItem.findMany({
      select: { type: true },
      orderBy: { adoId: 'asc' },
    });
    expect(types.map((t) => t.type)).toEqual(['Feature', 'UserStory', 'Bug', 'Spike', 'Support']);
  });

  it('should correctly resolve sprint from iteration paths across multiple sprints', async () => {
    const rawItems = [
      makeRawItem(601, 'User Story', 'Story in Sprint 20', iterationPath1),
      makeRawItem(602, 'User Story', 'Story in Sprint 21', iterationPath2),
    ];

    const context: WorkItemSyncContext = {
      sprintPaths: [iterationPath1, iterationPath2],
      sprintIdMap: new Map([
        [iterationPath1, sprint1Id],
        [iterationPath2, sprint2Id],
      ]),
      db: prisma,
      wiqlFetcher: jest.fn().mockResolvedValue([601, 602]),
      batchFetcher: jest.fn().mockResolvedValue(rawItems),
    };

    await syncWorkItemsForWorkstream({ id: wsId, adoAreaPath: areaPath, name: 'Streams' }, context);

    const wi1 = await prisma.workItem.findUnique({ where: { adoId: 601 } });
    const wi2 = await prisma.workItem.findUnique({ where: { adoId: 602 } });

    expect(wi1!.sprintId).toBe(sprint1Id);
    expect(wi2!.sprintId).toBe(sprint2Id);
  });
});
