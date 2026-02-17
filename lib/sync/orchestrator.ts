/**
 * ADO Sync Orchestrator
 *
 * Creates SyncLog at start, invokes sync phases per workstream with isolation,
 * aggregates results, and updates SyncLog on completion.
 * Iteration sync (Story 2) uses config + ado-client.
 * Work item sync (Story 3) fetches, maps, and upserts per workstream.
 */

import { prisma } from '@/lib/prisma';
import { fetchTeamIterations } from './ado-client';
import { syncCapacityForAllWorkstreams } from './capacity';
import { SYNC_CONFIG } from './config';
import { selectRollingFiveSprints, upsertSprintsFromIterations } from './iterations';
import type {
  PerWorkstreamSummary,
  SyncOrchestratorInput,
  SyncOrchestratorResult,
  WorkstreamSyncResult,
} from './types';
import { syncWorkItemsForWorkstream } from './work-items';

/** Default iterations fetcher using config + ado-client. */
const defaultIterationsFetcher = () =>
  fetchTeamIterations(SYNC_CONFIG.projectNameOrId, SYNC_CONFIG.iterationTeamId);

/** Build canonical ADO area path for a configured workstream. */
function buildAdoAreaPath(adoAreaPathSuffix: string): string {
  return `${SYNC_CONFIG.projectNameOrId}\\App\\LiveLink - Yellow Box${adoAreaPathSuffix}`;
}

/**
 * Ensure configured workstreams exist in DB so Sync Now remains self-healing
 * even when seed data was cleared by tests or local resets.
 */
async function ensureConfiguredWorkstreams(): Promise<void> {
  for (const cfg of SYNC_CONFIG.workstreams) {
    const adoAreaPath = buildAdoAreaPath(cfg.adoAreaPathSuffix);
    const existing = await prisma.workstream.findFirst({ where: { name: cfg.name } });
    if (existing) {
      if (existing.adoAreaPath !== adoAreaPath) {
        await prisma.workstream.update({
          where: { id: existing.id },
          data: { adoAreaPath },
        });
      }
      continue;
    }

    await prisma.workstream.create({
      data: {
        name: cfg.name,
        adoAreaPath,
      },
    });
  }
}

/**
 * Run ADO sync: create SyncLog, process workstreams with per-workstream isolation,
 * update SyncLog with final status and per-workstream summary.
 *
 * @param input - Optional syncType and syncWorkstreamFn override (for tests)
 * @returns syncLogId and summary with status, workstreams, totals
 */
export async function runSync(input: SyncOrchestratorInput = {}): Promise<SyncOrchestratorResult> {
  const syncType = input.syncType ?? 'Full';
  const syncFn = input.syncWorkstreamFn; // undefined = use real implementation
  const iterationsFetcher = input.iterationsFetcher ?? defaultIterationsFetcher;

  await ensureConfiguredWorkstreams();

  // 1. Create SyncLog with status Running
  const syncLog = await prisma.syncLog.create({
    data: {
      syncType,
      status: 'Running',
    },
  });

  const workstreams = await prisma.workstream.findMany({ orderBy: { name: 'asc' } });
  const perWorkstreamSummaries: PerWorkstreamSummary[] = [];
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let hasFailure = false;
  const errorMessages: string[] = [];

  // 1.5 Iteration sync (Story 2): for Full or Iterations, fetch and upsert rolling 5 sprints
  let currentSprintId: string | null = null;
  let currentSprintPath: string | null = null;
  let sprintsSynced = 0;
  let selectedSprintPathsOrderedDesc: string[] = [];
  /** Map from ADO iteration path → local Sprint.id (used by work item and capacity sync). */
  let sprintIdMap = new Map<string, string>();
  /** Map from ADO iteration path → iteration GUID (for capacity API). */
  const iterationIdMap = new Map<string, string>();

  if (syncType === 'Full' || syncType === 'Iterations' || syncType === 'Capacity') {
    try {
      const allIterations = await iterationsFetcher();
      const selected = selectRollingFiveSprints(allIterations);
      selectedSprintPathsOrderedDesc = selected.map((s) => s.path).filter((p): p is string => Boolean(p));
      if (selected.length > 0) {
        const current = selected.find((s) => s.isCurrent) ?? selected[0];
        const upsertResult = await upsertSprintsFromIterations(selected, current.path);
        currentSprintId = upsertResult.currentSprintId;
        currentSprintPath = upsertResult.currentSprintPath;
        sprintsSynced = upsertResult.created + upsertResult.updated;
        sprintIdMap = upsertResult.sprintIds;
        totalCreated += upsertResult.created;
        totalUpdated += upsertResult.updated;
        for (const it of selected) {
          if (it.path && it.id) {
            iterationIdMap.set(it.path, it.id);
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessages.push(`Iterations: ${msg}`);
      hasFailure = true;
    }
  }

  // 1.6 For WorkItems-only sync, load sprint data from DB (iterations not re-fetched)
  if (syncType === 'WorkItems' && sprintIdMap.size === 0) {
    const dbSprints = await prisma.sprint.findMany({
      where: { adoIterationPath: { not: null } },
      select: { id: true, adoIterationPath: true },
    });
    for (const s of dbSprints) {
      if (s.adoIterationPath) {
        sprintIdMap.set(s.adoIterationPath, s.id);
      }
    }
  }

  // 2. Process each workstream with try/catch isolation; one failure does not abort others
  const shouldSyncWorkItems = syncType === 'Full' || syncType === 'WorkItems';

  for (const ws of workstreams) {
    try {
      let result: WorkstreamSyncResult;

      if (syncFn) {
        // Test injection path: use the provided function
        result = await syncFn(ws.id, syncType);
      } else if (shouldSyncWorkItems) {
        // Real work item sync (Story 3)
        result = await syncWorkItemsForWorkstream(ws, {
          sprintPaths: Array.from(sprintIdMap.keys()),
          sprintIdMap,
        });
      } else {
        // Iterations-only or Capacity-only: no work item sync needed
        result = { itemsFetched: 0, itemsCreated: 0, itemsUpdated: 0 };
      }

      perWorkstreamSummaries.push({
        workstreamId: ws.id,
        status: 'Success',
        itemsFetched: result.itemsFetched,
        itemsCreated: result.itemsCreated,
        itemsUpdated: result.itemsUpdated,
        itemsSkipped: result.itemsSkipped,
      });
      totalFetched += result.itemsFetched;
      totalCreated += result.itemsCreated;
      totalUpdated += result.itemsUpdated;
    } catch (err) {
      hasFailure = true;
      const errorMsg = err instanceof Error ? err.message : String(err);
      errorMessages.push(`${ws.name}: ${errorMsg}`);
      perWorkstreamSummaries.push({
        workstreamId: ws.id,
        status: 'Failed',
        itemsFetched: 0,
        itemsCreated: 0,
        itemsUpdated: 0,
        error: errorMsg,
      });
    }
  }

  // 2.5 Capacity sync (Story 4): for Full or Capacity, fetch and upsert per workstream
  const shouldSyncCapacity = syncType === 'Full' || syncType === 'Capacity';
  if (shouldSyncCapacity && iterationIdMap.size > 0) {
    try {
      const capacityResults = await syncCapacityForAllWorkstreams(
        workstreams,
        sprintIdMap,
        iterationIdMap,
        { db: prisma }
      );

      for (const cap of capacityResults) {
        const summary = perWorkstreamSummaries.find((s) => s.workstreamId === cap.workstreamId);
        const ws = workstreams.find((w) => w.id === cap.workstreamId);
        if (summary) {
          summary.capacitySummary = {
            sprintsUpserted: cap.sprintsUpserted,
            sprintsSkippedLocked: cap.sprintsSkippedLocked,
            retries: cap.retries,
            error: cap.error,
          };
          if (cap.status === 'Failed') {
            summary.status = 'Failed';
            if (cap.error) {
              errorMessages.push(`Capacity ${ws?.name ?? cap.workstreamId}: ${cap.error}`);
            }
            hasFailure = true;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errorMessages.push(`Capacity: ${msg}`);
      hasFailure = true;
    }
  }

  // 3. Update SyncLog with final status, counts, and per-workstream summary
  const finalStatus = hasFailure ? 'Failed' : 'Success';
  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      status: finalStatus,
      itemsFetched: totalFetched,
      itemsCreated: totalCreated,
      itemsUpdated: totalUpdated,
      errorMessage: errorMessages.length > 0 ? errorMessages.join('; ') : null,
      perWorkstreamSummary: perWorkstreamSummaries as object,
      completedAt: new Date(),
    },
  });

  // Metric computation hook (Story 3) — non-fatal
  if (finalStatus === 'Success' && sprintIdMap.size > 0) {
    try {
      const { computeAllMetrics } = await import('@/lib/metrics/orchestrator');
      // Recompute rolling window oldest -> newest so current sprint projections can use prior snapshots.
      const orderedSprintIds = selectedSprintPathsOrderedDesc
        .slice()
        .reverse()
        .map((path) => sprintIdMap.get(path))
        .filter((id): id is string => Boolean(id));
      if (orderedSprintIds.length === 0 && currentSprintId) {
        orderedSprintIds.push(currentSprintId);
      }

      for (const sprintId of orderedSprintIds) {
        await computeAllMetrics(sprintId);
      }
    } catch {
      // Intentionally non-fatal: metric computation failure should not fail sync completion.
    }
  }

  return {
    syncLogId: syncLog.id,
    summary: {
      status: finalStatus,
      errorMessage: errorMessages.length > 0 ? errorMessages.join('; ') : null,
      workstreams: perWorkstreamSummaries,
      totals: {
        itemsFetched: totalFetched,
        itemsCreated: totalCreated,
        itemsUpdated: totalUpdated,
      },
      currentSprintId,
      currentSprintPath,
      sprintsSynced,
    },
  };
}
