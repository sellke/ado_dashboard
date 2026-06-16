/**
 * Work item ingestion and type mapping (Story 3).
 *
 * - Fetches work items from ADO via WIQL + batch API
 * - Filters to approved types (Feature, User Story, Bug, Spike, Support)
 * - Maps ADO fields to Prisma WorkItem model
 * - Upserts by adoId with revision-aware updates
 * - Resolves workstreamId from area path, sprintId from iteration path
 * - Tracks fetched/created/updated/skipped counters for sync diagnostics
 */

import type { PrismaClient, Workstream } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/prisma';
import { fetchWorkItemIdsByWiql, fetchWorkItemsBatch } from './ado-client';
import {
  isApprovedType,
  mapAdoWorkItem,
  type AdoWorkItemRaw,
  type MappedWorkItem,
} from './mappers';
import type { WorkstreamSyncResult } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ADO field reference names to request in batch fetch. */
export const WORK_ITEM_FIELDS = [
  'System.Id',
  'System.Rev',
  'System.WorkItemType',
  'System.Title',
  'System.State',
  'Microsoft.VSTS.Scheduling.StoryPoints',
  'Microsoft.VSTS.Scheduling.OriginalEstimate',
  'Microsoft.VSTS.Scheduling.CompletedWork',
  'Microsoft.VSTS.Scheduling.RemainingWork',
  'System.AreaPath',
  'System.IterationPath',
  'System.Parent',
  'System.AssignedTo',
  'System.Tags',
  'System.CreatedDate',
  'System.ChangedDate',
  'Microsoft.VSTS.Common.ActivatedDate',
  'Microsoft.VSTS.Common.ClosedDate',
];

// ---------------------------------------------------------------------------
// Context / DI types
// ---------------------------------------------------------------------------

/** Injection context for syncWorkItemsForWorkstream (testability). */
export interface WorkItemSyncContext {
  /** ADO iteration paths for the rolling window sprints. */
  sprintPaths: string[];
  /** Map from ADO iteration path → local Sprint.id. */
  sprintIdMap: Map<string, string>;
  /** ADO project override for tests; production reads from the workstream row. */
  adoProject?: string;
  /** Prisma client (defaults to app singleton). */
  db?: PrismaClient;
  /** Optional WIQL fetcher override (for tests). */
  wiqlFetcher?: (project: string, query: string) => Promise<number[]>;
  /** Optional batch fetcher override (for tests). */
  batchFetcher?: (project: string, ids: number[], fields: string[]) => Promise<AdoWorkItemRaw[]>;
}

// ---------------------------------------------------------------------------
// Resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolve workstream ID from an ADO area path.
 * Matches when the work item's area path equals or is a child of the workstream's adoAreaPath.
 *
 * @param areaPath - The work item's System.AreaPath value
 * @param workstreams - Local workstream records (id + adoAreaPath)
 * @returns Matching workstream ID or null
 */
export function resolveWorkstreamId(
  areaPath: string,
  workstreams: Pick<Workstream, 'id' | 'adoAreaPath'>[]
): string | null {
  for (const ws of workstreams) {
    if (areaPath === ws.adoAreaPath || areaPath.startsWith(`${ws.adoAreaPath}\\`)) {
      return ws.id;
    }
  }
  return null;
}

/**
 * Resolve sprint ID from an ADO iteration path.
 *
 * @param iterationPath - The work item's System.IterationPath value
 * @param sprintIdMap - Map from ADO iteration path → local Sprint.id
 * @returns Matching sprint ID or null
 */
export function resolveSprintId(
  iterationPath: string,
  sprintIdMap: Map<string, string>
): string | null {
  return sprintIdMap.get(iterationPath) ?? null;
}

// ---------------------------------------------------------------------------
// WIQL query builder
// ---------------------------------------------------------------------------

/**
 * Build a WIQL query to fetch work item IDs for a given area path and iteration paths.
 * Does NOT filter by type in WIQL so that in-code filtering can count skipped items.
 *
 * @param areaPath - ADO area path (uses UNDER semantics to include children)
 * @param iterationPaths - ADO iteration paths for the rolling sprint window
 * @returns WIQL query string; empty string if no iteration paths provided
 */
export function buildWorkItemWiql(areaPath: string, iterationPaths: string[]): string {
  if (iterationPaths.length === 0) {
    return '';
  }

  const escapedArea = areaPath.replace(/'/g, "''");
  const iterationClauses = iterationPaths.map((p) => `'${p.replace(/'/g, "''")}'`).join(', ');

  return (
    `SELECT [System.Id] FROM WorkItems ` +
    `WHERE [System.AreaPath] UNDER '${escapedArea}' ` +
    `AND [System.IterationPath] IN (${iterationClauses}) ` +
    `ORDER BY [System.Id]`
  );
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

/** Result of upserting a batch of mapped work items. */
export interface UpsertResult {
  created: number;
  updated: number;
  unchanged: number;
}

function hasLifecycleBackfill(
  existing: { adoActivatedDate: Date | null; adoClosedDate: Date | null },
  item: Pick<MappedWorkItem, 'adoActivatedDate' | 'adoClosedDate'>
): boolean {
  return (
    (existing.adoActivatedDate === null && item.adoActivatedDate !== null) ||
    (existing.adoClosedDate === null && item.adoClosedDate !== null)
  );
}

/**
 * Upsert mapped work items into the database.
 * - Uses adoId as the unique key.
 * - Revision-aware: skips update when adoRevision hasn't changed.
 * - Resolves workstreamId and sprintId for each item.
 *
 * @param items - Mapped work items (approved types, with all fields)
 * @param workstreams - Local workstreams for area path resolution
 * @param sprintIdMap - Map from ADO iteration path → local Sprint.id
 * @param db - Prisma client (defaults to app singleton)
 */
export async function upsertWorkItems(
  items: MappedWorkItem[],
  workstreams: Pick<Workstream, 'id' | 'adoAreaPath'>[],
  sprintIdMap: Map<string, string>,
  db?: PrismaClient
): Promise<UpsertResult> {
  const client = db ?? defaultPrisma;
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  // WIQL batches can return the same ADO id twice (e.g. overlapping queries); last row wins.
  const byAdoId = new Map<number, MappedWorkItem>();
  for (const item of items) {
    byAdoId.set(item.adoId, item);
  }
  const uniqueItems = Array.from(byAdoId.values());

  for (const item of uniqueItems) {
    const workstreamId = resolveWorkstreamId(item.areaPath, workstreams);
    const sprintId = resolveSprintId(item.iterationPath, sprintIdMap);

    const data = {
      adoRevision: item.adoRevision,
      type: item.type,
      title: item.title,
      state: item.state,
      storyPoints: item.storyPoints,
      originalEstimate: item.originalEstimate,
      completedWork: item.completedWork,
      remainingWork: item.remainingWork,
      areaPath: item.areaPath,
      iterationPath: item.iterationPath,
      parentAdoId: item.parentAdoId,
      assignedTo: item.assignedTo,
      tags: item.tags,
      adoCreatedDate: item.adoCreatedDate,
      adoChangedDate: item.adoChangedDate,
      adoActivatedDate: item.adoActivatedDate,
      adoClosedDate: item.adoClosedDate,
      workstreamId,
      sprintId,
    };

    const existing = await client.workItem.findUnique({
      where: { adoId: item.adoId },
      select: { id: true, adoRevision: true, adoActivatedDate: true, adoClosedDate: true },
    });

    if (existing) {
      // Revision-aware: only update when ADO revision has changed
      if (
        existing.adoRevision !== null &&
        existing.adoRevision === item.adoRevision &&
        !hasLifecycleBackfill(existing, item)
      ) {
        unchanged++;
        continue;
      }

      await client.workItem.update({
        where: { adoId: item.adoId },
        data,
      });
      updated++;
    } else {
      await client.workItem.create({
        data: {
          adoId: item.adoId,
          ...data,
        },
      });
      created++;
    }
  }

  return { created, updated, unchanged };
}

// ---------------------------------------------------------------------------
// Top-level workstream sync
// ---------------------------------------------------------------------------

/** Extended result that includes skipped item count for diagnostics. */
export type WorkItemSyncResultExt = WorkstreamSyncResult &
  Required<Pick<WorkstreamSyncResult, 'itemsSkipped'>>;

/**
 * Sync work items for a single workstream from ADO.
 *
 * Flow:
 * 1. Build WIQL query from workstream area path + sprint iteration paths
 * 2. Fetch matching work item IDs from ADO
 * 3. Batch-fetch full work item details
 * 4. Map and filter to approved types (count skipped)
 * 5. Upsert to database with revision-aware checks
 *
 * @param workstream - Local workstream record (id, adoAreaPath, name)
 * @param context - Sprint paths, ID map, and optional DI overrides
 * @returns Sync counters: fetched, created, updated, skipped
 */
export async function syncWorkItemsForWorkstream(
  workstream: Pick<Workstream, 'id' | 'adoAreaPath' | 'name'> &
    Partial<Pick<Workstream, 'adoProject'>>,
  context: WorkItemSyncContext
): Promise<WorkItemSyncResultExt> {
  const db = context.db ?? defaultPrisma;
  const wiqlFetch = context.wiqlFetcher ?? fetchWorkItemIdsByWiql;
  const batchFetch = context.batchFetcher ?? fetchWorkItemsBatch;
  const { sprintPaths, sprintIdMap } = context;
  const adoProject = workstream.adoProject ?? context.adoProject;

  if (sprintPaths.length === 0) {
    return { itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0, itemsSkipped: 0 };
  }
  if (!adoProject) {
    throw new Error(`Missing ADO project for workstream ${workstream.name}`);
  }

  // 1. Build WIQL query and fetch work item IDs
  const wiql = buildWorkItemWiql(workstream.adoAreaPath, sprintPaths);
  const ids = await wiqlFetch(adoProject, wiql);

  if (ids.length === 0) {
    return { itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0, itemsSkipped: 0 };
  }

  // 2. Batch-fetch work item details
  const rawItems = await batchFetch(adoProject, ids, WORK_ITEM_FIELDS);

  const itemsFetched = rawItems.length;

  // 3. Map and filter to approved types
  let itemsSkipped = 0;
  const mapped: MappedWorkItem[] = [];

  for (const raw of rawItems) {
    const adoType = raw.fields['System.WorkItemType'];
    if (adoType && !isApprovedType(adoType)) {
      itemsSkipped++;
      continue;
    }

    const item = mapAdoWorkItem(raw.fields);
    if (item) {
      mapped.push(item);
    } else {
      itemsSkipped++;
    }
  }

  // 4. Load all workstreams for resolution
  const allWorkstreams = await db.workstream.findMany({
    select: { id: true, adoAreaPath: true },
  });

  // 5. Upsert
  const result = await upsertWorkItems(mapped, allWorkstreams, sprintIdMap, db);

  return {
    itemsFetched,
    itemsCreated: result.created,
    itemsUpdated: result.updated,
    itemsSkipped,
  };
}
