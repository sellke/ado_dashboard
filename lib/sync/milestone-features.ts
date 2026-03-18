/**
 * Feature Goal Sync (Stories 1 & 7 — Phase 1E/2).
 *
 * Fetches ADO Features tagged with `ADP-{MON}` (e.g. `ADP-MAR`) from a workstream's
 * area path, upserts them as WorkItems, and auto-creates/updates Milestone records
 * with targetMonth derived from the tag.
 */

import type { PrismaClient, Workstream } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { fetchWorkItemIdsByWiql, fetchWorkItemsBatch } from './ado-client';
import { SYNC_CONFIG } from './config';
import { mapAdoWorkItem, type AdoWorkItemRaw } from './mappers';
import { upsertWorkItems, WORK_ITEM_FIELDS } from './work-items';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Injection context for syncMilestoneFeatures (testability). */
export interface MilestoneFeatureSyncContext {
  /** Prisma client (defaults to app singleton). */
  db?: PrismaClient;
  /** Optional WIQL fetcher override (for tests). */
  wiqlFetcher?: (project: string, query: string) => Promise<number[]>;
  /** Optional batch fetcher override (for tests). */
  batchFetcher?: (project: string, ids: number[], fields: string[]) => Promise<AdoWorkItemRaw[]>;
  /** Today's date override (for deterministic year-rollover tests). */
  today?: Date;
  /** Map from ADO iteration path → local Sprint.id (for child story sprint resolution). */
  sprintIdMap?: Map<string, string>;
}

/** Summary counters from a single milestone-feature sync run. */
export interface MilestoneFeatureSyncResult {
  featuresFetched: number;
  featuresUpserted: number;
  milestonesCreated: number;
  milestonesUpdated: number;
  childStoriesFetched: number;
  childStoriesUpserted: number;
}

// ---------------------------------------------------------------------------
// WIQL builder
// ---------------------------------------------------------------------------

/**
 * Build a WIQL query for all Features under an area path.
 * No iteration or tag filter in WIQL — ADP tag filtering happens in code
 * because ADO WIQL `CONTAINS` does starts-with matching on individual tags,
 * which misses year-prefixed formats like `25ADP`.
 *
 * @param areaPath - ADO area path (UNDER semantics)
 * @returns WIQL query string
 */
export function buildFeatureGoalWiql(areaPath: string): string {
  const escapedArea = areaPath.replace(/'/g, "''");
  return (
    `SELECT [System.Id] FROM WorkItems ` +
    `WHERE [System.AreaPath] UNDER '${escapedArea}' ` +
    `AND [System.WorkItemType] = 'Feature' ` +
    `ORDER BY [System.Id]`
  );
}

/**
 * Build a WIQL query for child User Stories of specific Feature ADO IDs.
 * No area path or iteration filter — captures all children regardless of sprint.
 *
 * @param featureAdoIds - Parent Feature ADO IDs
 * @returns WIQL query string, or empty string if no IDs provided
 */
export function buildChildStoriesWiql(featureAdoIds: number[]): string {
  if (featureAdoIds.length === 0) {
    return '';
  }
  const idList = featureAdoIds.join(', ');
  return (
    `SELECT [System.Id] FROM WorkItems ` +
    `WHERE [System.Parent] IN (${idList}) ` +
    `AND [System.WorkItemType] = 'User Story' ` +
    `ORDER BY [System.Id]`
  );
}

// ---------------------------------------------------------------------------
// Tag parser
// ---------------------------------------------------------------------------

const MONTH_ABBR_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parse a semicolon-delimited tags string and extract an `ADP-{MON}` tag.
 * Returns the first day of the target month as a UTC Date, or null if none found.
 *
 * Strict format: only `ADP-JAN` through `ADP-DEC` (case-insensitive) are recognized.
 * Legacy `{MonthAbbr}-Goal` tags are NOT recognized.
 *
 * Year selection: use current year; if that month is in the past relative to `today`,
 * roll forward to next year.
 *
 * @param tags - Semicolon-delimited tag string (e.g. "ADP-MAR; Sprint Planning")
 * @param today - Reference date for year-rollover (defaults to current date)
 * @returns Date(year, monthIndex, 1) in UTC, or null
 */
export function parseAdpTag(tags: string, today: Date = new Date()): Date | null {
  const parts = tags.split(';').map((t) => t.trim());

  // Pass 1: prefer the strict month-specific format ADP-{MON}
  for (const part of parts) {
    const match = part.match(/^ADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i);
    if (!match) {
      continue;
    }
    const monthIndex = MONTH_ABBR_MAP[match[1].toLowerCase()];
    if (monthIndex === undefined) {
      continue;
    }
    let year = today.getFullYear();
    if (monthIndex < today.getMonth()) {
      year += 1;
    }
    return new Date(Date.UTC(year, monthIndex, 1));
  }

  // Pass 2: year-prefixed format {YY}ADP (e.g. "25ADP" = FY25 ADP milestone)
  for (const part of parts) {
    if (part.match(/^\d{2}ADP$/i)) {
      return new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Quarter tag parser
// ---------------------------------------------------------------------------

/**
 * Parse a semicolon-delimited tags string and extract a `Qx` quarter tag.
 * Returns the uppercase quarter string (e.g. "Q4") or null if none found.
 *
 * Strict format: only `Q1` through `Q4` (case-insensitive) are recognized.
 *
 * @param tags - Semicolon-delimited tag string (e.g. "ADP-MAR; Q4; Sprint Planning")
 * @returns "Q1" | "Q2" | "Q3" | "Q4" | null
 */
export function parseQuarterTag(tags: string): string | null {
  const parts = tags.split(';').map((t) => t.trim());
  for (const part of parts) {
    const match = part.match(/^(Q[1-4])(?:\s|$)/i);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Quarter → targetMonth helper
// ---------------------------------------------------------------------------

const QUARTER_START_MONTH: Record<string, number> = {
  Q1: 0,  // January
  Q2: 3,  // April
  Q3: 6,  // July
  Q4: 9,  // October
};

/**
 * Derive a targetMonth Date from a quarter string (e.g. "Q4" → October 1 of the
 * current fiscal year). Returns null if quarter is not recognized.
 */
export function quarterToTargetMonth(quarter: string | null, today: Date = new Date()): Date | null {
  if (!quarter) return null;
  const monthIndex = QUARTER_START_MONTH[quarter.toUpperCase()];
  if (monthIndex === undefined) return null;
  return new Date(Date.UTC(today.getFullYear(), monthIndex, 1));
}

// ---------------------------------------------------------------------------
// Milestone upsert
// ---------------------------------------------------------------------------

interface FeatureForMilestone {
  adoId: number;
  title: string;
  tags: string | null;
  workstreamId: string | null;
}

interface MilestoneUpsertResult {
  created: number;
  updated: number;
}

/**
 * Upsert Milestone records from synced Feature WorkItems.
 * Features with ADP tags use the ADP-derived targetMonth; features with only
 * quarter tags (e.g. "Q4 PLAN") fall back to the first month of that quarter.
 * Matches on `adoFeatureId` — creates if absent, updates title/targetMonth/workstreamId if present.
 */
async function upsertMilestonesFromFeatures(
  features: FeatureForMilestone[],
  db: PrismaClient,
  today: Date
): Promise<MilestoneUpsertResult> {
  let created = 0;
  let updated = 0;

  for (const feature of features) {
    if (!feature.tags) {
      continue;
    }
    const quarter = parseQuarterTag(feature.tags);
    const targetMonth = parseAdpTag(feature.tags, today) ?? quarterToTargetMonth(quarter, today);
    if (!targetMonth) {
      continue;
    }
    if (!feature.workstreamId) {
      continue;
    }

    const existing = await db.milestone.findFirst({
      where: { adoFeatureId: feature.adoId },
      select: { id: true },
    });

    if (existing) {
      await db.milestone.update({
        where: { id: existing.id },
        data: {
          title: feature.title,
          targetMonth,
          workstreamId: feature.workstreamId,
          quarter,
        },
      });
      updated++;
    } else {
      await db.milestone.create({
        data: {
          title: feature.title,
          adoFeatureId: feature.adoId,
          workstreamId: feature.workstreamId,
          targetMonth,
          quarter,
          status: 'NotStarted',
        },
      });
      created++;
    }
  }

  return { created, updated };
}

// ---------------------------------------------------------------------------
// Top-level sync
// ---------------------------------------------------------------------------

/**
 * Sync all Features with `ADP-{MON}` tags for a workstream, plus their child
 * User Stories (so milestone progress can be computed from local data).
 *
 * Flow:
 * 1. Build feature-goal WIQL (area path only, no iteration filter)
 * 2. Fetch matching Feature IDs from ADO
 * 3. Batch-fetch full work item details
 * 4. Upsert Feature WorkItems
 * 5. Upsert Milestone records for Features with valid ADP tags
 * 6. Fetch and upsert child User Stories of those Features
 *
 * @param workstream - Workstream record (id, adoAreaPath, name)
 * @param context - Optional DB/fetcher overrides for testing
 * @returns Counters for features, milestones, and child stories
 */
export async function syncMilestoneFeatures(
  workstream: Pick<Workstream, 'id' | 'adoAreaPath' | 'name'>,
  context: MilestoneFeatureSyncContext = {}
): Promise<MilestoneFeatureSyncResult> {
  const db = context.db ?? defaultPrisma;
  const wiqlFetch = context.wiqlFetcher ?? fetchWorkItemIdsByWiql;
  const batchFetch = context.batchFetcher ?? fetchWorkItemsBatch;
  const today = context.today ?? new Date();
  const sprintIdMap = context.sprintIdMap ?? new Map<string, string>();

  const emptyResult: MilestoneFeatureSyncResult = {
    featuresFetched: 0,
    featuresUpserted: 0,
    milestonesCreated: 0,
    milestonesUpdated: 0,
    childStoriesFetched: 0,
    childStoriesUpserted: 0,
  };

  // 1. Build and execute WIQL (fetches ALL Features — tag filtering is in code)
  const wiql = buildFeatureGoalWiql(workstream.adoAreaPath);
  const ids = await wiqlFetch(SYNC_CONFIG.projectNameOrId, wiql);

  if (ids.length === 0) {
    return emptyResult;
  }

  // 2. Batch-fetch work item details
  const rawItems = await batchFetch(SYNC_CONFIG.projectNameOrId, ids, WORK_ITEM_FIELDS);

  // 3. Map and keep only Features
  const allMapped = rawItems
    .map((raw) => mapAdoWorkItem(raw.fields))
    .filter((item): item is NonNullable<typeof item> => item !== null && item.type === 'Feature');

  // 4. Code-level milestone tag filter — keep features with ADP or quarter tags
  const hasMilestoneTag = (tags: string | null): boolean => {
    if (!tags) return false;
    if (tags.toLowerCase().includes('adp')) return true;
    return parseQuarterTag(tags) !== null;
  };

  const mapped = allMapped.filter((item) => hasMilestoneTag(item.tags));

  const featuresFetched = mapped.length;

  if (mapped.length === 0) {
    return emptyResult;
  }

  // 5. Upsert ADP-tagged Feature WorkItems
  const allWorkstreams = await db.workstream.findMany({
    select: { id: true, adoAreaPath: true },
  });
  const upsertResult = await upsertWorkItems(mapped, allWorkstreams, new Map(), db);
  const featuresUpserted = upsertResult.created + upsertResult.updated;

  // 6. Build feature list for milestone upsert; resolve workstreamId per feature
  const featuresForMilestones: FeatureForMilestone[] = mapped.map((item) => {
    const matchingWs = allWorkstreams.find(
      (ws) => item.areaPath === ws.adoAreaPath || item.areaPath.startsWith(`${ws.adoAreaPath}\\`)
    );
    return {
      adoId: item.adoId,
      title: item.title,
      tags: item.tags,
      workstreamId: matchingWs?.id ?? null,
    };
  });

  const milestoneResult = await upsertMilestonesFromFeatures(featuresForMilestones, db, today);

  // 7. Fetch and upsert child User Stories of ADP-tagged Features
  const featureAdoIds = mapped.map((f) => f.adoId);
  let childStoriesFetched = 0;
  let childStoriesUpserted = 0;

  const childWiql = buildChildStoriesWiql(featureAdoIds);
  if (childWiql) {
    const childIds = await wiqlFetch(SYNC_CONFIG.projectNameOrId, childWiql);

    if (childIds.length > 0) {
      const rawChildren = await batchFetch(SYNC_CONFIG.projectNameOrId, childIds, WORK_ITEM_FIELDS);
      childStoriesFetched = rawChildren.length;

      const mappedChildren = rawChildren
        .map((raw) => mapAdoWorkItem(raw.fields))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const childUpsert = await upsertWorkItems(mappedChildren, allWorkstreams, sprintIdMap, db);
      childStoriesUpserted = childUpsert.created + childUpsert.updated;
    }
  }

  return {
    featuresFetched,
    featuresUpserted,
    milestonesCreated: milestoneResult.created,
    milestonesUpdated: milestoneResult.updated,
    childStoriesFetched,
    childStoriesUpserted,
  };
}
