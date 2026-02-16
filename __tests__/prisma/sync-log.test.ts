/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('SyncLog model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a SyncLog with required fields', async () => {
    const log = await prisma.syncLog.create({
      data: {
        syncType: 'WorkItems',
        status: 'Running',
      },
    });

    expect(log.syncType).toBe('WorkItems');
    expect(log.status).toBe('Running');
    expect(log.itemsFetched).toBeNull();
    expect(log.itemsCreated).toBeNull();
    expect(log.itemsUpdated).toBeNull();
    expect(log.errorMessage).toBeNull();
    expect(log.completedAt).toBeNull();
  });

  it('should create a SyncLog with all optional fields', async () => {
    const completedAt = new Date();

    const log = await prisma.syncLog.create({
      data: {
        syncType: 'Full',
        status: 'Success',
        itemsFetched: 100,
        itemsCreated: 50,
        itemsUpdated: 30,
        errorMessage: null,
        completedAt,
      },
    });

    expect(log.itemsFetched).toBe(100);
    expect(log.itemsCreated).toBe(50);
    expect(log.itemsUpdated).toBe(30);
    expect(log.completedAt).toEqual(completedAt);
  });

  it('should auto-generate a CUID ID', async () => {
    const log = await prisma.syncLog.create({
      data: {
        syncType: 'WorkItems',
        status: 'Running',
      },
    });

    expect(log.id).toBeDefined();
    expect(typeof log.id).toBe('string');
    expect(log.id.length).toBeGreaterThan(0);
  });

  it('should auto-set startedAt and createdAt defaults', async () => {
    const before = new Date();

    const log = await prisma.syncLog.create({
      data: {
        syncType: 'WorkItems',
        status: 'Running',
      },
    });

    const after = new Date();

    expect(log.startedAt).toBeInstanceOf(Date);
    expect(log.createdAt).toBeInstanceOf(Date);
    expect(log.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(log.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(log.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(log.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should accept SyncType enum value: WorkItems', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'WorkItems', status: 'Running' },
    });
    expect(log.syncType).toBe('WorkItems');
  });

  it('should accept SyncType enum value: Iterations', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'Iterations', status: 'Running' },
    });
    expect(log.syncType).toBe('Iterations');
  });

  it('should accept SyncType enum value: Capacity', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'Capacity', status: 'Running' },
    });
    expect(log.syncType).toBe('Capacity');
  });

  it('should accept SyncType enum value: Full', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'Full', status: 'Running' },
    });
    expect(log.syncType).toBe('Full');
  });

  it('should accept SyncStatus enum value: Running', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'WorkItems', status: 'Running' },
    });
    expect(log.status).toBe('Running');
  });

  it('should accept SyncStatus enum value: Success', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'WorkItems', status: 'Success' },
    });
    expect(log.status).toBe('Success');
  });

  it('should accept SyncStatus enum value: Failed', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'WorkItems', status: 'Failed' },
    });
    expect(log.status).toBe('Failed');
  });

  it('should store errorMessage for failed syncs', async () => {
    const log = await prisma.syncLog.create({
      data: {
        syncType: 'WorkItems',
        status: 'Failed',
        errorMessage: 'Connection timeout to ADO API',
      },
    });

    expect(log.errorMessage).toBe('Connection timeout to ADO API');
  });

  it('should support querying by startedAt for recent sync history', async () => {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await prisma.syncLog.create({
      data: { syncType: 'WorkItems', status: 'Success', startedAt: twoHoursAgo },
    });
    await prisma.syncLog.create({
      data: { syncType: 'Iterations', status: 'Success', startedAt: hourAgo },
    });
    await prisma.syncLog.create({
      data: { syncType: 'Full', status: 'Running', startedAt: now },
    });

    // Query recent syncs (last 90 minutes)
    const cutoff = new Date(now.getTime() - 90 * 60 * 1000);
    const recentLogs = await prisma.syncLog.findMany({
      where: { startedAt: { gte: cutoff } },
      orderBy: { startedAt: 'desc' },
    });

    expect(recentLogs).toHaveLength(2);
    expect(recentLogs[0].syncType).toBe('Full');
    expect(recentLogs[1].syncType).toBe('Iterations');
  });

  it('should be stored in the sync_logs table (snake_case mapping)', async () => {
    const log = await prisma.syncLog.create({
      data: { syncType: 'WorkItems', status: 'Running' },
    });

    // Verify via raw SQL that the table name is snake_case
    const result = await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM sync_logs WHERE id = ${log.id}`;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(log.id);
  });

  it('should verify index exists on startedAt column', async () => {
    // Query PostgreSQL system catalog for the index
    // Prisma names the index: sync_logs_startedAt_idx (camelCase field name)
    const indexes = await prisma.$queryRaw<
      { indexname: string }[]
    >`SELECT indexname FROM pg_indexes WHERE tablename = 'sync_logs' AND indexname LIKE '%startedAt%'`;

    expect(indexes.length).toBeGreaterThan(0);
  });

  it('should store perWorkstreamSummary as JSON', async () => {
    const summary = [
      {
        workstreamId: 'ws-1',
        status: 'Success',
        itemsFetched: 10,
        itemsCreated: 5,
        itemsUpdated: 3,
      },
      {
        workstreamId: 'ws-2',
        status: 'Failed',
        itemsFetched: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        error: 'Connection timeout',
      },
    ];

    const log = await prisma.syncLog.create({
      data: {
        syncType: 'Full',
        status: 'Failed',
        perWorkstreamSummary: summary as object,
      },
    });

    expect(log.perWorkstreamSummary).not.toBeNull();
    const stored = log.perWorkstreamSummary as Array<Record<string, unknown>>;
    expect(stored).toHaveLength(2);
    expect(stored[0]!.workstreamId).toBe('ws-1');
    expect(stored[0]!.status).toBe('Success');
    expect(stored[1]!.error).toBe('Connection timeout');
  });

  it('should function independently without Workstream or Sprint dependencies', async () => {
    // Create SyncLog without any reference to Workstream/Sprint
    const log = await prisma.syncLog.create({
      data: {
        syncType: 'Full',
        status: 'Success',
        itemsFetched: 200,
        itemsCreated: 100,
        itemsUpdated: 50,
        completedAt: new Date(),
      },
    });

    expect(log.id).toBeDefined();

    // Query it back independently
    const fetched = await prisma.syncLog.findUnique({
      where: { id: log.id },
    });
    expect(fetched).not.toBeNull();
    expect(fetched!.syncType).toBe('Full');
  });
});
