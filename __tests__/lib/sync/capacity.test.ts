/**
 * @jest-environment node
 *
 * Tests for Story 4: capacity sync, resilience, and validation.
 *
 * Unit tests:
 * - aggregateCapacity (pure math: grossHours, ptoHours, fteCount)
 * - capacityLocked guard (skip overwrite when locked)
 * - getWorkstreamTeamId (config lookup)
 *
 * Integration tests (against test DB):
 * - syncCapacityForWorkstream with mocked fetcher
 * - capacityLocked preservation
 * - Per-workstream isolation (one failure doesn't block others)
 * - Retry count tracked in capacitySummary
 */

import {
  aggregateCapacity,
  countMeetingOverheadMembers,
  getWorkstreamTeamId,
  syncCapacityForAllWorkstreams,
  syncCapacityForWorkstream,
  type CapacitySyncContext,
} from '@/lib/sync/capacity';
import type { AdoCapacityMember } from '@/lib/sync/types';
import { cleanupTestData, prisma } from '../../prisma/helpers';

// =============================================================================
// UNIT TESTS: aggregateCapacity
// =============================================================================

describe('aggregateCapacity', () => {
  const sprintStart = new Date('2026-02-02');
  const sprintEnd = new Date('2026-02-13'); // 10 working days (Mon-Fri)

  it('should aggregate grossHours from activities capacityPerDay', () => {
    const members: AdoCapacityMember[] = [
      {
        activities: [
          { name: 'Development', capacityPerDay: 6 },
          { name: 'Design', capacityPerDay: 2 },
        ],
        daysOff: [],
      },
      {
        activities: [{ name: 'Development', capacityPerDay: 8 }],
        daysOff: [],
      },
    ];

    const result = aggregateCapacity(members, sprintStart, sprintEnd);
    // Member 1: 8 hrs/day * 10 days = 80
    // Member 2: 8 hrs/day * 10 days = 80
    // Total: 160
    expect(result.grossHours).toBe(160);
    expect(result.fteCount).toBe(2);
    expect(result.meetingOverheadMemberCount).toBe(2);
    expect(result.ptoHours).toBe(0);
  });

  it('should subtract ptoHours when member has days off', () => {
    const members: AdoCapacityMember[] = [
      {
        activities: [{ name: 'Development', capacityPerDay: 8 }],
        daysOff: [
          { start: '2026-02-05T00:00:00Z', end: '2026-02-05T23:59:59Z' },
          { start: '2026-02-10T00:00:00Z', end: '2026-02-10T23:59:59Z' },
        ],
      },
    ];

    const result = aggregateCapacity(members, sprintStart, sprintEnd);
    // 2 days off → 8 working days, grossHours = 8*8 = 64, ptoHours = 8*2 = 16
    expect(result.grossHours).toBe(64);
    expect(result.ptoHours).toBe(16);
    expect(result.fteCount).toBe(1);
    expect(result.meetingOverheadMemberCount).toBe(1);
  });

  it('should extract ceremony hours from activities named Meeting or Ceremony', () => {
    const members: AdoCapacityMember[] = [
      {
        activities: [
          { name: 'Development', capacityPerDay: 6 },
          { name: 'Meeting', capacityPerDay: 2 },
        ],
        daysOff: [],
      },
    ];

    const result = aggregateCapacity(members, sprintStart, sprintEnd);
    expect(result.grossHours).toBe(80); // 8 * 10
    expect(result.ceremonyHours).toBe(20); // 2 * 10
    expect(result.fteCount).toBe(1);
    expect(result.meetingOverheadMemberCount).toBe(1);
  });

  it('should return zeros for empty members', () => {
    const result = aggregateCapacity([], sprintStart, sprintEnd);
    expect(result.grossHours).toBe(0);
    expect(result.ptoHours).toBe(0);
    expect(result.ceremonyHours).toBe(0);
    expect(result.fteCount).toBe(0);
    expect(result.meetingOverheadMemberCount).toBe(0);
  });

  it('should handle members with no activities', () => {
    const members: AdoCapacityMember[] = [{ activities: [], daysOff: [] }];
    const result = aggregateCapacity(members, sprintStart, sprintEnd);
    expect(result.grossHours).toBe(0);
    expect(result.fteCount).toBe(1);
    expect(result.meetingOverheadMemberCount).toBe(1);
  });

  it('should handle members with undefined activities', () => {
    const members: AdoCapacityMember[] = [{ daysOff: [] }];
    const result = aggregateCapacity(members, sprintStart, sprintEnd);
    expect(result.grossHours).toBe(0);
    expect(result.fteCount).toBe(1);
    expect(result.meetingOverheadMemberCount).toBe(1);
  });
});

describe('countMeetingOverheadMembers', () => {
  it('counts members with QA or BA activity names', () => {
    expect(
      countMeetingOverheadMembers([
        { activities: [{ name: 'Testing', capacityPerDay: 8 }], daysOff: [] },
        { activities: [{ name: 'Requirements', capacityPerDay: 6 }], daysOff: [] },
      ])
    ).toBe(2);
  });

  it('falls back to full team size when no activity matches', () => {
    expect(
      countMeetingOverheadMembers([
        { activities: [{ name: 'Scrum Master', capacityPerDay: 8 }], daysOff: [] },
        { activities: [{ name: 'Project Management', capacityPerDay: 8 }], daysOff: [] },
      ])
    ).toBe(2);
  });
});

// =============================================================================
// UNIT TESTS: getWorkstreamTeamId
// =============================================================================

describe('getWorkstreamTeamId', () => {
  it('should return team ID for Streams workstream', () => {
    expect(getWorkstreamTeamId('Streams')).toBe('ae8bcdaa-d61b-475c-ba34-13c88b1adf8e');
  });

  it('should return team ID for Action Tracker', () => {
    expect(getWorkstreamTeamId('Action Tracker')).toBe('69fee166-1ccb-43b5-afcd-5d3f08fa2198');
  });

  it('should return undefined for unknown workstream name', () => {
    expect(getWorkstreamTeamId('Unknown Team')).toBeUndefined();
  });
});

// =============================================================================
// INTEGRATION TESTS: syncCapacityForWorkstream
// =============================================================================

describe('syncCapacityForWorkstream', () => {
  const areaPath = 'Project\\App\\LiveLink\\Streams';
  const iterationPath = 'Event Streaming Platform\\FY27\\Q1\\Sprint 27.1';
  const iterationId = 'def498ab-a9cf-41eb-a7c7-9eb67d1852ef';

  let wsId: string;
  let sprintId: string;

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();

    const ws = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: areaPath },
    });
    wsId = ws.id;

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 27.1',
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

  const makeContext = (
    capacityFetcher: CapacitySyncContext['capacityFetcher']
  ): CapacitySyncContext => ({
    sprintPaths: [iterationPath],
    sprintIdMap: new Map([[iterationPath, sprintId]]),
    iterationIdMap: new Map([[iterationPath, iterationId]]),
    capacityFetcher,
    db: prisma,
  });

  it('should upsert SprintWorkstream with aggregated capacity when not locked', async () => {
    const mockMembers: AdoCapacityMember[] = [
      {
        activities: [
          { name: 'Development', capacityPerDay: 6 },
          { name: 'Design', capacityPerDay: 2 },
        ],
        daysOff: [],
      },
    ];

    const mockFetcher = jest.fn().mockResolvedValue({ members: mockMembers, retries: 0 });

    const result = await syncCapacityForWorkstream(
      { id: wsId, name: 'Streams', adoAreaPath: areaPath },
      makeContext(mockFetcher)
    );

    expect(result.sprintsUpserted).toBe(1);
    expect(result.sprintsSkippedLocked).toBe(0);
    expect(result.retries).toBe(0);

    const sw = await prisma.sprintWorkstream.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId: wsId } },
    });
    expect(sw).not.toBeNull();
    expect(sw!.grossHours).toBe(80); // 8 * 10 days
    expect(sw!.fteCount).toBe(1);
    expect(sw!.meetingOverheadMemberCount).toBe(1);
    expect(sw!.capacityLocked).toBe(false);
  });

  it('should NOT overwrite capacity when capacityLocked is true', async () => {
    // Pre-create SprintWorkstream with locked manual override
    await prisma.sprintWorkstream.create({
      data: {
        sprintId,
        workstreamId: wsId,
        grossHours: 999,
        ptoHours: 5,
        fteCount: 3,
        capacityLocked: true,
      },
    });

    const mockMembers: AdoCapacityMember[] = [
      { activities: [{ name: 'Development', capacityPerDay: 8 }], daysOff: [] },
    ];
    const mockFetcher = jest.fn().mockResolvedValue({ members: mockMembers, retries: 0 });

    const result = await syncCapacityForWorkstream(
      { id: wsId, name: 'Streams', adoAreaPath: areaPath },
      makeContext(mockFetcher)
    );

    expect(result.sprintsUpserted).toBe(0);
    expect(result.sprintsSkippedLocked).toBe(1);

    const sw = await prisma.sprintWorkstream.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId: wsId } },
    });
    expect(sw!.grossHours).toBe(999);
    expect(sw!.ptoHours).toBe(5);
    expect(sw!.fteCount).toBe(3);
    expect(sw!.capacityLocked).toBe(true);
  });

  it('should create SprintWorkstream if it does not exist', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({
      members: [{ activities: [{ name: 'Development', capacityPerDay: 8 }], daysOff: [] }],
      retries: 0,
    });

    const result = await syncCapacityForWorkstream(
      { id: wsId, name: 'Streams', adoAreaPath: areaPath },
      makeContext(mockFetcher)
    );

    expect(result.sprintsUpserted).toBe(1);

    const sw = await prisma.sprintWorkstream.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId: wsId } },
    });
    expect(sw).not.toBeNull();
    expect(sw!.grossHours).toBe(80);
  });

  it('should return zero when no sprint paths provided', async () => {
    const result = await syncCapacityForWorkstream(
      { id: wsId, name: 'Streams', adoAreaPath: areaPath },
      {
        sprintPaths: [],
        sprintIdMap: new Map(),
        iterationIdMap: new Map(),
        capacityFetcher: jest.fn(),
        db: prisma,
      }
    );

    expect(result.sprintsUpserted).toBe(0);
    expect(result.sprintsSkippedLocked).toBe(0);
    expect(result.retries).toBe(0);
  });

  it('should skip sprint when iterationId is missing in map', async () => {
    const ctx: CapacitySyncContext = {
      sprintPaths: [iterationPath],
      sprintIdMap: new Map([[iterationPath, sprintId]]),
      iterationIdMap: new Map(), // No iteration ID
      capacityFetcher: jest.fn(),
      db: prisma,
    };

    const result = await syncCapacityForWorkstream(
      { id: wsId, name: 'Streams', adoAreaPath: areaPath },
      ctx
    );

    expect(result.sprintsUpserted).toBe(0);
    expect(ctx.capacityFetcher).not.toHaveBeenCalled();
  });
});

// =============================================================================
// INTEGRATION TESTS: syncCapacityForAllWorkstreams (per-workstream isolation)
// =============================================================================

describe('syncCapacityForAllWorkstreams', () => {
  const iterationPath = 'Event Streaming Platform\\FY27\\Q1\\Sprint 27.1';
  const iterationId = 'def498ab-a9cf-41eb-a7c7-9eb67d1852ef';

  let ws1Id: string;
  let ws2Id: string;
  let sprintId: string;

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();

    const ws1 = await prisma.workstream.create({
      data: { name: 'Streams', adoAreaPath: 'Project\\Streams' },
    });
    ws1Id = ws1.id;

    const ws2 = await prisma.workstream.create({
      data: { name: 'Action Tracker', adoAreaPath: 'Project\\Action Tracker' },
    });
    ws2Id = ws2.id;

    const sprint = await prisma.sprint.create({
      data: {
        name: 'Sprint 27.1',
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

  it('should isolate failures: one workstream fails, others succeed', async () => {
    const sprintIdMap = new Map([[iterationPath, sprintId]]);
    const iterationIdMap = new Map([[iterationPath, iterationId]]);

    const workstreams = [
      { id: ws1Id, name: 'Streams', adoAreaPath: 'Project\\Streams' },
      { id: ws2Id, name: 'Action Tracker', adoAreaPath: 'Project\\Action Tracker' },
    ];

    let callCount = 0;
    const capacityFetcher = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('ADO timeout');
      }
      return {
        members: [{ activities: [{ name: 'Development', capacityPerDay: 8 }], daysOff: [] }],
        retries: 0,
      };
    });

    const results = await syncCapacityForAllWorkstreams(workstreams, sprintIdMap, iterationIdMap, {
      capacityFetcher,
      db: prisma,
    });

    expect(results).toHaveLength(2);

    const ws1Result = results.find((r) => r.workstreamId === ws1Id)!;
    expect(ws1Result.status).toBe('Failed');
    expect(ws1Result.error).toContain('ADO timeout');
    expect(ws1Result.sprintsUpserted).toBe(0);

    const ws2Result = results.find((r) => r.workstreamId === ws2Id)!;
    expect(ws2Result.status).toBe('Success');
    expect(ws2Result.sprintsUpserted).toBe(1);

    const sw2 = await prisma.sprintWorkstream.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId: ws2Id } },
    });
    expect(sw2).not.toBeNull();
    expect(sw2!.grossHours).toBe(80);
  });

  it('should record retry count when fetcher returns retries metadata', async () => {
    const sprintIdMap = new Map([[iterationPath, sprintId]]);
    const iterationIdMap = new Map([[iterationPath, iterationId]]);

    const workstreams = [{ id: ws1Id, name: 'Streams', adoAreaPath: 'Project\\Streams' }];

    const capacityFetcher = jest.fn().mockResolvedValue({
      members: [{ activities: [{ name: 'Development', capacityPerDay: 8 }], daysOff: [] }],
      retries: 2,
    });

    const results = await syncCapacityForAllWorkstreams(workstreams, sprintIdMap, iterationIdMap, {
      capacityFetcher,
      db: prisma,
    });

    expect(results[0].status).toBe('Success');
    expect(results[0].sprintsUpserted).toBe(1);
    expect(results[0].retries).toBe(2);
  });
});
