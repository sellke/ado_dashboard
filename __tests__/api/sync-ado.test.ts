/**
 * @jest-environment node
 *
 * Integration tests for POST /api/sync/ado endpoint.
 * Tests sync orchestration, SyncLog lifecycle, and per-workstream isolation.
 */

jest.mock('@/lib/sync/ado-client', () => ({
  ...jest.requireActual('@/lib/sync/ado-client'),
  fetchTeamIterations: jest.fn(),
  fetchWorkItemIdsByWiql: jest.fn(),
  fetchWorkItemsBatch: jest.fn(),
  fetchTeamCapacity: jest.fn(),
}));

import { POST } from '@/app/api/sync/ado/route';
import {
  fetchTeamCapacity,
  fetchTeamIterations,
  fetchWorkItemIdsByWiql,
  fetchWorkItemsBatch,
} from '@/lib/sync/ado-client';
import { SYNC_CONFIG } from '@/lib/sync/config';
import {
  buildDefaultAdoAreaPath,
  DEFAULT_ADO_ORG,
} from '@/lib/sync/defaults';
import { INGEST_SPRINT_DEPTH } from '@/lib/sync/window';
import { getDefaultSyncProgramConfig } from '@/prisma/seed';
import { cleanupTestData, prisma } from '../prisma/helpers';

const MOCK_ITERATION = {
  path: `${SYNC_CONFIG.projectNameOrId}\\FY27\\Q1\\Sprint 27.1`,
  name: 'Sprint 27.1',
  id: 'def498ab-a9cf-41eb-a7c7-9eb67d1852ef',
  startDate: new Date('2026-04-27'),
  finishDate: new Date('2026-05-08'),
  isCurrent: true,
};

describe('POST /api/sync/ado', () => {
  // Orchestrator + DB can exceed 15s on slower hosts / OneDrive paths
  jest.setTimeout(60000);

  beforeAll(async () => {
    await cleanupTestData();

    await prisma.syncProgramConfig.create({
      data: getDefaultSyncProgramConfig(),
    });

    // Seed workstreams with registry fields so sync-config-loader includes them
    await prisma.workstream.createMany({
      data: [
        {
          name: 'Streams',
          adoAreaPath: buildDefaultAdoAreaPath('\\Streams'),
          adoOrg: DEFAULT_ADO_ORG,
          adoProject: SYNC_CONFIG.projectNameOrId,
          adoTeamId: 'ae8bcdaa-d61b-475c-ba34-13c88b1adf8e',
          syncEnabled: true,
        },
        {
          name: 'Pitch Tracker',
          adoAreaPath: buildDefaultAdoAreaPath('\\Pitch Tracker'),
          adoOrg: DEFAULT_ADO_ORG,
          adoProject: SYNC_CONFIG.projectNameOrId,
          adoTeamId: '178ad7d2-bd20-42f9-a992-43b20dfa9b9e',
          syncEnabled: true,
        },
      ],
    });

    await prisma.sprint.create({
      data: {
        name: MOCK_ITERATION.name,
        adoIterationPath: MOCK_ITERATION.path,
        startDate: MOCK_ITERATION.startDate,
        endDate: MOCK_ITERATION.finishDate,
      },
    });

    jest.mocked(fetchTeamIterations).mockResolvedValue([MOCK_ITERATION]);
    jest.mocked(fetchWorkItemIdsByWiql).mockResolvedValue([]);
    jest.mocked(fetchWorkItemsBatch).mockResolvedValue([]);
    jest.mocked(fetchTeamCapacity).mockResolvedValue({ members: [], retries: 0 });
  });

  afterEach(async () => {
    await prisma.syncLog.deleteMany({});
  });

  afterAll(async () => {
    jest.resetAllMocks();
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('should accept POST and return success, syncLogId, and summary shape', async () => {
    const req = new Request('http://localhost/api/sync/ado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('success');
    expect(typeof data.success).toBe('boolean');
    expect(data).toHaveProperty('syncLogId');
    expect(typeof data.syncLogId).toBe('string');
    expect(data.syncLogId.length).toBeGreaterThan(0);
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('status');
    expect(data.summary).toHaveProperty('workstreams');
    expect(Array.isArray(data.summary.workstreams)).toBe(true);
    expect(data.summary).toHaveProperty('totals');
    expect(typeof data.summary.totals).toBe('object');
  });

  it('should create a SyncLog and complete full lifecycle (startedAt, completedAt, final status)', async () => {
    const req = new Request('http://localhost/api/sync/ado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    const data = await res.json();

    const log = await prisma.syncLog.findUnique({
      where: { id: data.syncLogId },
    });
    expect(log).not.toBeNull();
    expect(log!.startedAt).toBeInstanceOf(Date);
    expect(log!.completedAt).not.toBeNull();
    expect(['Success', 'Failed']).toContain(log!.status);
  });

  it('should update SyncLog with final status and counts on completion', async () => {
    const req = new Request('http://localhost/api/sync/ado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    const data = await res.json();
    expect(data.success).toBe(true);

    const log = await prisma.syncLog.findUnique({
      where: { id: data.syncLogId },
    });
    expect(log).not.toBeNull();
    expect(log!.status).toBe('Success');
    expect(log!.completedAt).not.toBeNull();
    expect(log!.itemsFetched).toBeDefined();
    expect(log!.itemsCreated).toBeDefined();
    expect(log!.itemsUpdated).toBeDefined();
  });

  it('should include per-workstream summary in response', async () => {
    const req = new Request('http://localhost/api/sync/ado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    const data = await res.json();

    expect(data.summary.workstreams.length).toBeGreaterThan(0);
    for (const ws of data.summary.workstreams) {
      expect(ws).toHaveProperty('workstreamId');
      expect(ws).toHaveProperty('status');
      expect(ws).toHaveProperty('itemsFetched');
      expect(ws).toHaveProperty('itemsCreated');
      expect(ws).toHaveProperty('itemsUpdated');
    }
  });

  it('should persist per-workstream summary to SyncLog', async () => {
    const req = new Request('http://localhost/api/sync/ado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    const data = await res.json();

    const log = await prisma.syncLog.findUnique({
      where: { id: data.syncLogId },
    });
    expect(log).not.toBeNull();
    expect(log!.perWorkstreamSummary).not.toBeNull();
    const summary = log!.perWorkstreamSummary as Array<Record<string, unknown>>;
    expect(Array.isArray(summary)).toBe(true);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary[0]).toHaveProperty('workstreamId');
    expect(summary[0]).toHaveProperty('status');
    expect(summary[0]).toHaveProperty('itemsFetched');
  });

  it('should accept optional syncType in body', async () => {
    const req = new Request('http://localhost/api/sync/ado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncType: 'WorkItems' }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const log = await prisma.syncLog.findUnique({
      where: { id: data.syncLogId },
    });
    expect(log!.syncType).toBe('WorkItems');
  });

  it('should include currentSprintId, currentSprintPath, sprintsSynced when iteration sync runs', async () => {
    const { runSync } = await import('@/lib/sync/orchestrator');
    const path = 'Project\\FY27\\Q1\\Sprint 27.1';

    const result = await runSync({
      iterationsFetcher: async () => [
        {
          path,
          name: 'Sprint 27.1',
          id: 'def498ab-a9cf-41eb-a7c7-9eb67d1852ef',
          startDate: new Date('2026-04-27'),
          finishDate: new Date('2026-05-08'),
          isCurrent: true,
        },
      ],
    });

    expect(result.summary.currentSprintId).toBeTruthy();
    expect(result.summary.currentSprintPath).toBe(path);
    expect(result.summary.sprintsSynced).toBe(1);
  });

  it('should run capacity sync for Full sync and include capacitySummary in workstreams', async () => {
    const { runSync } = await import('@/lib/sync/orchestrator');
    const path = 'Project\\FY27\\Q1\\Sprint 27.1';

    const result = await runSync({
      syncType: 'Full',
      iterationsFetcher: async () => [
        {
          path,
          name: 'Sprint 27.1',
          id: 'def498ab-a9cf-41eb-a7c7-9eb67d1852ef',
          startDate: new Date('2026-04-27'),
          finishDate: new Date('2026-05-08'),
          isCurrent: true,
        },
      ],
    });

    expect(result.summary.workstreams.length).toBeGreaterThan(0);
    for (const ws of result.summary.workstreams) {
      expect(ws.capacitySummary).toBeDefined();
      expect(ws.capacitySummary).toHaveProperty('sprintsUpserted');
      expect(ws.capacitySummary).toHaveProperty('sprintsSkippedLocked');
      expect(ws.capacitySummary).toHaveProperty('retries');
    }
  });

  it('should pass all ingested sprints to work items, capacity, and metric recompute', async () => {
    const { runSync } = await import('@/lib/sync/orchestrator');
    const base = 'Project\\FY27\\Q1';
    const iterations = Array.from({ length: INGEST_SPRINT_DEPTH }, (_, index) => {
      const sprintNumber = index + 1;
      const startDay = 1 + index * 14;
      return {
        path: `${base}\\Sprint ${sprintNumber}`,
        name: `Sprint ${sprintNumber}`,
        id: `iteration-${sprintNumber}`,
        startDate: new Date(Date.UTC(2026, 0, startDay)),
        finishDate: new Date(Date.UTC(2026, 0, startDay + 13)),
        isCurrent: sprintNumber === INGEST_SPRINT_DEPTH,
      };
    });
    const expectedPathsDesc = iterations.map((it) => it.path).reverse();
    const workItemSprintPaths: string[][] = [];
    let firstSprintIdMap: Map<string, string> | null = null;
    let capacitySprintCount = 0;
    let capacityIterationCount = 0;
    const milestoneSprintCounts: number[] = [];
    const metricSprintIds: string[] = [];

    const result = await runSync({
      syncType: 'Full',
      iterationsFetcher: async () => iterations,
      syncWorkItemsForWorkstreamFn: async (_workstream, context) => {
        workItemSprintPaths.push([...context.sprintPaths]);
        firstSprintIdMap ??= new Map(context.sprintIdMap);
        return { itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0 };
      },
      syncMilestoneFeaturesFn: async (_workstream, context) => {
        milestoneSprintCounts.push(context?.sprintIdMap?.size ?? 0);
        return {
          featuresFetched: 0,
          featuresUpserted: 0,
          milestonesCreated: 0,
          milestonesUpdated: 0,
          childStoriesFetched: 0,
          childStoriesUpserted: 0,
        };
      },
      syncCapacityForAllWorkstreamsFn: async (workstreams, sprintIdMap, iterationIdMap) => {
        capacitySprintCount = sprintIdMap.size;
        capacityIterationCount = iterationIdMap.size;
        return workstreams.map((workstream) => ({
          workstreamId: workstream.id,
          status: 'Success' as const,
          sprintsUpserted: sprintIdMap.size,
          sprintsSkippedLocked: 0,
          retries: 0,
        }));
      },
      computeMetricsFn: async (sprintId) => {
        metricSprintIds.push(sprintId);
      },
    });

    expect(result.summary.status).toBe('Success');
    expect(result.summary.sprintsSynced).toBe(INGEST_SPRINT_DEPTH);
    expect(workItemSprintPaths.length).toBeGreaterThan(0);
    expect(workItemSprintPaths).toEqual(
      expect.arrayContaining([expect.arrayContaining(expectedPathsDesc)])
    );
    workItemSprintPaths.forEach((paths) => expect(paths).toEqual(expectedPathsDesc));
    expect(capacitySprintCount).toBe(INGEST_SPRINT_DEPTH);
    expect(capacityIterationCount).toBe(INGEST_SPRINT_DEPTH);
    milestoneSprintCounts.forEach((count) => expect(count).toBe(INGEST_SPRINT_DEPTH));
    expect(firstSprintIdMap).not.toBeNull();
    const expectedMetricIdsOldestToNewest = [...expectedPathsDesc]
      .reverse()
      .map((path) => firstSprintIdMap!.get(path));
    expect(metricSprintIds).toEqual(expectedMetricIdsOldestToNewest);
  });

  it('should continue for remaining workstreams when one fails (partial failure)', async () => {
    // Use orchestrator directly with a mock that fails for the first workstream
    const { runSync } = await import('@/lib/sync/orchestrator');
    const workstreams = await prisma.workstream.findMany({ orderBy: { name: 'asc' } });
    const workstreamCount = workstreams.length;
    const firstId = workstreams[0]!.id;

    const result = await runSync({
      syncWorkstreamFn: async (wsId, _syncType) => {
        if (wsId === firstId) throw new Error('Simulated workstream failure');
        return { itemsFetched: 5, itemsCreated: 2, itemsUpdated: 1 };
      },
    });

    // Process should not have crashed - we got a valid result
    expect(result.syncLogId).toBeDefined();
    expect(result.summary.status).toBe('Failed');

    // All workstreams should be present (none skipped due to crash)
    expect(result.summary.workstreams.length).toBe(workstreamCount);
    const failed = result.summary.workstreams.find((w) => w.workstreamId === firstId);
    expect(failed).toBeDefined();
    expect(failed!.status).toBe('Failed');
    expect(failed!.error).toBe('Simulated workstream failure');

    const succeeded = result.summary.workstreams.filter((w) => w.status === 'Success');
    expect(succeeded.length).toBe(workstreamCount - 1);

    // SyncLog should be updated with partial failure
    const log = await prisma.syncLog.findUnique({
      where: { id: result.syncLogId },
    });
    expect(log!.status).toBe('Failed');
    expect(log!.errorMessage).toContain('Simulated workstream failure');
  });
});
