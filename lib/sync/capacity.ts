/**
 * Capacity sync from ADO (Story 4).
 *
 * - Fetches team capacity per iteration from ADO REST API
 * - Aggregates grossHours, ptoHours, ceremonyHours, fteCount
 * - Respects capacityLocked: never overwrite when true
 * - Per-workstream isolation: one failure does not block others
 * - Retry logic in ADO client; retry count recorded in SyncLog
 */

import type { PrismaClient, Workstream } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { fetchTeamCapacity } from './ado-client';
import { SYNC_CONFIG } from './config';
import type { AdoCapacityMember, AggregatedCapacity } from './types';

// ---------------------------------------------------------------------------
// Activity name patterns for ceremony extraction
// ---------------------------------------------------------------------------

const CEREMONY_ACTIVITY_NAMES = ['Meeting', 'Ceremony', 'Standup', 'Planning', 'Retrospective'];

/**
 * ADO capacity activity names that imply developer, QA/test, or BA/RA for meeting overhead headcount.
 * Member counts if any activity name matches (case-insensitive).
 */
const MEETING_OVERHEAD_ACTIVITY_PATTERNS: RegExp[] = [
  /\b(?:dev|development|developer|engineering|coding)\b/i,
  /\b(?:test|testing|qa|quality|qc)\b/i,
  /\b(?:requirement|requirements|analyst|analysis|business|ba\b)\b/i,
];

/**
 * Count capacity members who qualify for per-sprint meeting overhead (8.25h each).
 * Uses activity names from ADO team capacity; members with no activities count as delivery FTE.
 * If no member matches any pattern (custom activity names), falls back to full team size.
 */
export function countMeetingOverheadMembers(members: AdoCapacityMember[]): number {
  if (members.length === 0) {
    return 0;
  }

  let eligible = 0;
  for (const m of members) {
    const activities = m.activities ?? [];
    if (activities.length === 0) {
      eligible++;
      continue;
    }
    const matched = activities.some((a) =>
      MEETING_OVERHEAD_ACTIVITY_PATTERNS.some((p) => p.test((a.name ?? '').trim()))
    );
    if (matched) {
      eligible++;
    }
  }

  return eligible > 0 ? eligible : members.length;
}

function isCeremonyActivity(name: string): boolean {
  const lower = name.toLowerCase();
  return CEREMONY_ACTIVITY_NAMES.some((n) => lower.includes(n.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Pure aggregation
// ---------------------------------------------------------------------------

/**
 * Count working days (Mon-Fri) between two dates inclusive.
 * Uses UTC to avoid timezone issues when comparing dates.
 */
export function countWorkingDays(start: Date, end: Date): number {
  const s = new Date(start);
  const e = new Date(end);
  const sUtc = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
  const eUtc = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
  if (sUtc > eUtc) {
    return 0;
  }
  let count = 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  for (let t = sUtc; t <= eUtc; t += msPerDay) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  return count;
}

/**
 * Count calendar days in a date range (start and end inclusive).
 * Parses ISO strings; returns 0 if invalid.
 */
function countDaysInRange(startStr?: string, endStr?: string): number {
  if (!startStr || !endStr) {
    return 0;
  }
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = (end.getTime() - start.getTime()) / msPerDay;
  return Math.max(0, Math.floor(diff) + 1);
}

/**
 * Aggregate ADO capacity members into SprintWorkstream fields.
 * grossHours = sum of (capacityPerDay * workingDays) per member, minus days off.
 * ptoHours = sum of (capacityPerDay * daysOff) per member.
 * ceremonyHours = sum of capacityPerDay for Meeting/Ceremony activities * workingDays.
 * fteCount = number of members.
 * meetingOverheadMemberCount = dev / QA / BA headcount for synthetic dashboard meeting hours.
 *
 * @param members - ADO capacity API response
 * @param sprintStart - Sprint start date
 * @param sprintEnd - Sprint end date
 */
export function aggregateCapacity(
  members: AdoCapacityMember[],
  sprintStart: Date,
  sprintEnd: Date
): AggregatedCapacity {
  const sprintWorkingDays = countWorkingDays(sprintStart, sprintEnd);
  let grossHours = 0;
  let ptoHours = 0;
  let ceremonyHours = 0;

  for (const m of members) {
    const activities = m.activities ?? [];
    const capacityPerDay = activities.reduce((sum, a) => sum + (a.capacityPerDay ?? 0), 0);
    const ceremonyPerDay = activities
      .filter((a) => isCeremonyActivity(a.name ?? ''))
      .reduce((sum, a) => sum + (a.capacityPerDay ?? 0), 0);

    let daysOff = 0;
    for (const range of m.daysOff ?? []) {
      daysOff += countDaysInRange(range.start, range.end);
    }

    const workingDays = Math.max(0, sprintWorkingDays - daysOff);
    grossHours += capacityPerDay * workingDays;
    ptoHours += capacityPerDay * daysOff;
    ceremonyHours += ceremonyPerDay * workingDays;
  }

  return {
    grossHours,
    ptoHours,
    ceremonyHours,
    fteCount: members.length,
    meetingOverheadMemberCount: countMeetingOverheadMembers(members),
  };
}

// ---------------------------------------------------------------------------
// Config lookup
// ---------------------------------------------------------------------------

/**
 * Resolve ADO team ID for a workstream by name.
 * Matches SYNC_CONFIG.workstreams by name.
 */
export function getWorkstreamTeamId(workstreamName: string): string | undefined {
  const ws = SYNC_CONFIG.workstreams.find((w) => w.name === workstreamName);
  return ws?.teamId;
}

// ---------------------------------------------------------------------------
// Context / DI
// ---------------------------------------------------------------------------

export interface CapacitySyncContext {
  sprintPaths: string[];
  sprintIdMap: Map<string, string>;
  /** Map from ADO iteration path → iteration GUID (for capacity API). */
  iterationIdMap: Map<string, string>;
  /** Optional override for tests. */
  capacityFetcher?: (
    project: string,
    team: string,
    iterationId: string
  ) => Promise<{ members: AdoCapacityMember[]; retries: number }>;
  db?: PrismaClient;
}

/** Per-workstream capacity sync result. */
export interface CapacityWorkstreamResult {
  workstreamId: string;
  status: 'Success' | 'Failed';
  sprintsUpserted: number;
  sprintsSkippedLocked: number;
  retries: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

/**
 * Sync capacity for a single workstream across all sprints.
 * Skips sprints when capacityLocked is true; skips when iterationId is missing.
 *
 * @param workstream - Local workstream (id, name, adoAreaPath)
 * @param context - Sprint paths, ID maps, optional fetcher
 */
export async function syncCapacityForWorkstream(
  workstream: Pick<Workstream, 'id' | 'name' | 'adoAreaPath'>,
  context: CapacitySyncContext
): Promise<{
  sprintsUpserted: number;
  sprintsSkippedLocked: number;
  retries: number;
  error?: string;
}> {
  const db = context.db ?? defaultPrisma;
  const { sprintPaths, sprintIdMap, iterationIdMap } = context;

  const teamId = getWorkstreamTeamId(workstream.name);
  if (!teamId) {
    return { sprintsUpserted: 0, sprintsSkippedLocked: 0, retries: 0 };
  }

  const fetcher =
    context.capacityFetcher ??
    (async (project, team, iterId) => {
      return fetchTeamCapacity(project, team, iterId);
    });

  let sprintsUpserted = 0;
  let sprintsSkippedLocked = 0;
  let totalRetries = 0;

  for (const path of sprintPaths) {
    const sprintId = sprintIdMap.get(path);
    const iterationId = iterationIdMap.get(path);
    if (!sprintId || !iterationId) {
      continue;
    }

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      select: { startDate: true, endDate: true },
    });
    if (!sprint) {
      continue;
    }

    const existing = await db.sprintWorkstream.findUnique({
      where: { sprintId_workstreamId: { sprintId, workstreamId: workstream.id } },
    });

    if (existing?.capacityLocked) {
      sprintsSkippedLocked++;
      continue;
    }

    const { members, retries } = await fetcher(SYNC_CONFIG.projectNameOrId, teamId, iterationId);
    totalRetries += retries;

    const agg = aggregateCapacity(members, sprint.startDate, sprint.endDate);

    await db.sprintWorkstream.upsert({
      where: { sprintId_workstreamId: { sprintId, workstreamId: workstream.id } },
      create: {
        sprintId,
        workstreamId: workstream.id,
        grossHours: agg.grossHours,
        ptoHours: agg.ptoHours,
        ceremonyHours: agg.ceremonyHours,
        fteCount: agg.fteCount,
      },
      update: {
        grossHours: agg.grossHours,
        ptoHours: agg.ptoHours,
        ceremonyHours: agg.ceremonyHours,
        fteCount: agg.fteCount,
      },
    });

    // Set meeting headcount outside Prisma upsert so sync works if @prisma/client was generated
    // before `meetingOverheadMemberCount` existed (avoids "Unknown argument" until `prisma generate`).
    try {
      await db.$executeRaw`
        UPDATE "sprint_workstreams"
        SET "meetingOverheadMemberCount" = ${agg.meetingOverheadMemberCount}
        WHERE "sprintId" = ${sprintId} AND "workstreamId" = ${workstream.id}
      `;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/42703|does not exist|undefined column/i.test(msg)) {
        throw e;
      }
      // Migration not applied yet — dashboard metrics fall back to fteCount for meeting overhead.
    }

    sprintsUpserted++;
  }

  return { sprintsUpserted, sprintsSkippedLocked, retries: totalRetries };
}

/**
 * Sync capacity for all workstreams with per-workstream isolation.
 * One failure does not block others; each result includes retries and status.
 *
 * @param workstreams - Local workstream records
 * @param sprintIdMap - Map from iteration path → sprint ID
 * @param iterationIdMap - Map from iteration path → iteration GUID
 * @param options - Optional fetcher and db
 */
export async function syncCapacityForAllWorkstreams(
  workstreams: Pick<Workstream, 'id' | 'name' | 'adoAreaPath'>[],
  sprintIdMap: Map<string, string>,
  iterationIdMap: Map<string, string>,
  options?: { capacityFetcher?: CapacitySyncContext['capacityFetcher']; db?: PrismaClient }
): Promise<CapacityWorkstreamResult[]> {
  const results: CapacityWorkstreamResult[] = [];
  const sprintPaths = Array.from(sprintIdMap.keys());

  for (const ws of workstreams) {
    try {
      const result = await syncCapacityForWorkstream(ws, {
        sprintPaths,
        sprintIdMap,
        iterationIdMap,
        capacityFetcher: options?.capacityFetcher,
        db: options?.db,
      });

      results.push({
        workstreamId: ws.id,
        status: 'Success',
        sprintsUpserted: result.sprintsUpserted,
        sprintsSkippedLocked: result.sprintsSkippedLocked,
        retries: result.retries,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        workstreamId: ws.id,
        status: 'Failed',
        sprintsUpserted: 0,
        sprintsSkippedLocked: 0,
        retries: 0,
        error: errorMsg,
      });
    }
  }

  return results;
}
