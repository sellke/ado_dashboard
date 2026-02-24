/**
 * Feature Goal Sync (Story 1 — Phase 1E).
 *
 * Fetches ADO Features tagged with `-Goal` (e.g. `Feb-Goal`) from a workstream's
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
}

/** Summary counters from a single milestone-feature sync run. */
export interface MilestoneFeatureSyncResult {
  featuresFetched: number;
  featuresUpserted: number;
  milestonesCreated: number;
  milestonesUpdated: number;
}

// ---------------------------------------------------------------------------
// WIQL builder
// ---------------------------------------------------------------------------

/**
 * Build a WIQL query for Features with `-Goal` tags under an area path.
 * No iteration filter — Features live outside sprints.
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
    `AND [System.Tags] CONTAINS '-Goal' ` +
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
 * Parse a semicolon-delimited tags string and extract a `{MonthAbbr}-Goal` tag.
 * Returns the first day of the target month as a UTC Date, or null if none found.
 *
 * Year selection: use current year; if that month is in the past relative to `today`,
 * roll forward to next year.
 *
 * @param tags - Semicolon-delimited tag string (e.g. "Feb-Goal; Sprint Planning")
 * @param today - Reference date for year-rollover (defaults to current date)
 * @returns Date(year, monthIndex, 1) in UTC, or null
 */
export function parseGoalTag(tags: string, today: Date = new Date()): Date | null {
  const parts = tags.split(';').map((t) => t.trim());
  for (const part of parts) {
    const match = part.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-Goal$/i);
    if (!match) {
      continue;
    }
    const monthIndex = MONTH_ABBR_MAP[match[1].toLowerCase()];
    if (monthIndex === undefined) {
      continue;
    }
    let year = today.getFullYear();
    // Roll forward to next year when the month has already passed this year
    if (monthIndex < today.getMonth()) {
      year += 1;
    }
    return new Date(Date.UTC(year, monthIndex, 1));
  }
  return null;
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
 * Only Features whose tags contain a parseable `-Goal` tag produce Milestone records.
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
    const targetMonth = parseGoalTag(feature.tags, today);
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
 * Sync all Features with `-Goal` tags for a workstream.
 *
 * Flow:
 * 1. Build feature-goal WIQL (area path only, no iteration filter)
 * 2. Fetch matching Feature IDs from ADO
 * 3. Batch-fetch full work item details
 * 4. Upsert WorkItems (reuses upsertWorkItems from work-items.ts)
 * 5. Upsert Milestone records for Features with valid goal tags
 *
 * @param workstream - Workstream record (id, adoAreaPath, name)
 * @param context - Optional DB/fetcher overrides for testing
 * @returns Counters for features and milestones
 */
export async function syncMilestoneFeatures(
  workstream: Pick<Workstream, 'id' | 'adoAreaPath' | 'name'>,
  context: MilestoneFeatureSyncContext = {}
): Promise<MilestoneFeatureSyncResult> {
  const db = context.db ?? defaultPrisma;
  const wiqlFetch = context.wiqlFetcher ?? fetchWorkItemIdsByWiql;
  const batchFetch = context.batchFetcher ?? fetchWorkItemsBatch;
  const today = context.today ?? new Date();

  // 1. Build and execute WIQL
  const wiql = buildFeatureGoalWiql(workstream.adoAreaPath);
  const ids = await wiqlFetch(SYNC_CONFIG.projectNameOrId, wiql);

  if (ids.length === 0) {
    return { featuresFetched: 0, featuresUpserted: 0, milestonesCreated: 0, milestonesUpdated: 0 };
  }

  // 2. Batch-fetch work item details
  const rawItems = await batchFetch(SYNC_CONFIG.projectNameOrId, ids, WORK_ITEM_FIELDS);
  const featuresFetched = rawItems.length;

  // 3. Map items — keep only Features (WIQL should already filter, but guard defensively)
  const mapped = rawItems
    .map((raw) => mapAdoWorkItem(raw.fields))
    .filter((item): item is NonNullable<typeof item> => item !== null && item.type === 'Feature');

  // 4. Upsert WorkItems using empty sprintIdMap (Features have no iteration path)
  const allWorkstreams = await db.workstream.findMany({
    select: { id: true, adoAreaPath: true },
  });
  const upsertResult = await upsertWorkItems(mapped, allWorkstreams, new Map(), db);
  const featuresUpserted = upsertResult.created + upsertResult.updated;

  // 5. Build feature list for milestone upsert; resolve workstreamId per feature
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

  return {
    featuresFetched,
    featuresUpserted,
    milestonesCreated: milestoneResult.created,
    milestonesUpdated: milestoneResult.updated,
  };
}
