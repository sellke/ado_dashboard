/**
 * ADO Sync Orchestrator
 *
 * Creates SyncLog at start, invokes sync phases per workstream with isolation,
 * aggregates results, and updates SyncLog on completion.
 * Iteration sync (Story 2) uses config + ado-client.
 * Work item sync (Story 3) fetches, maps, and upserts per workstream.
 */

import { bootstrapDefaultDataIfEmpty } from '@/lib/db/bootstrap';
import { prisma } from '@/lib/prisma';
import { fetchTeamIterations } from './ado-client';
import { syncCapacityForAllWorkstreams } from './capacity';
import { selectRollingSprints, upsertSprintsFromIterations } from './iterations';
import { syncMilestoneFeatures } from './milestone-features';
import { loadSyncProgramConfig, loadSyncWorkstreams } from './sync-config-loader';
import type {
  PerWorkstreamSummary,
  SyncOrchestratorInput,
  SyncOrchestratorResult,
  WorkstreamSyncResult,
} from './types';
import { syncWorkItemsForWorkstream } from './work-items';

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
  const syncWorkItemsFn = input.syncWorkItemsForWorkstreamFn ?? syncWorkItemsForWorkstream;
  const syncCapacityFn = input.syncCapacityForAllWorkstreamsFn ?? syncCapacityForAllWorkstreams;
  const syncMilestoneFeaturesFn = input.syncMilestoneFeaturesFn ?? syncMilestoneFeatures;
  const computeMetricsFn =
    input.computeMetricsFn ??
    (async (sprintId: string) => {
      const { computeAllMetrics } = await import('@/lib/metrics/orchestrator');
      return computeAllMetrics(sprintId);
    });
  const programConfig = await loadSyncProgramConfig(prisma);
  const iterationsFetcher =
    input.iterationsFetcher ??
    (() => fetchTeamIterations(programConfig.adoProject, programConfig.iterationTeamId));

  let workstreams = await loadSyncWorkstreams(prisma);
  if (workstreams.length === 0 && (await prisma.workstream.count()) === 0) {
    await bootstrapDefaultDataIfEmpty(prisma);
    workstreams = await loadSyncWorkstreams(prisma);
  }

  // 1. Create SyncLog with status Running
  const syncLog = await prisma.syncLog.create({
    data: {
      syncType,
      status: 'Running',
    },
  });

  const perWorkstreamSummaries: PerWorkstreamSummary[] = [];
  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let hasFailure = false;
  const errorMessages: string[] = [];

  if (
    workstreams.length === 0 &&
    (syncType === 'Full' || syncType === 'WorkItems' || syncType === 'Capacity')
  ) {
    const totalWorkstreams = await prisma.workstream.count();
    if (totalWorkstreams === 0) {
      errorMessages.push(
        'No workstreams configured. Add workstreams in Settings → Workstream Registry, or run pnpm db:bootstrap to restore defaults.'
      );
    } else {
      errorMessages.push(
        `No sync-enabled workstreams (${totalWorkstreams} registered but disabled). Enable at least one in Settings → Workstream Registry.`
      );
    }
    hasFailure = true;
  }

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
      const { sprints: selected, currentSprint } = selectRollingSprints(
        allIterations,
        programConfig.lookbackSprintCount
      );

      selectedSprintPathsOrderedDesc = selected
        .map((s) => s.path)
        .filter((p): p is string => Boolean(p));
      if (selected.length > 0) {
        const current = currentSprint ?? selected[0];
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
        result = await syncWorkItemsFn(ws, {
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

  // 2.5 Feature Goal Sync (Story 1 — Phase 1E): for Full, sync ADP-tagged Features, Milestones, and child stories
  if (syncType === 'Full' && !syncFn) {
    for (const ws of workstreams) {
      try {
        const milestoneResult = await syncMilestoneFeaturesFn(ws, { sprintIdMap });
        totalCreated += milestoneResult.milestonesCreated + milestoneResult.childStoriesUpserted;
        totalUpdated += milestoneResult.milestonesUpdated;

        const summary = perWorkstreamSummaries.find((s) => s.workstreamId === ws.id);
        if (summary) {
          summary.milestoneSummary = {
            featuresFetched: milestoneResult.featuresFetched,
            featuresUpserted: milestoneResult.featuresUpserted,
            milestonesCreated: milestoneResult.milestonesCreated,
            milestonesUpdated: milestoneResult.milestonesUpdated,
            childStoriesFetched: milestoneResult.childStoriesFetched,
            childStoriesUpserted: milestoneResult.childStoriesUpserted,
          };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errorMessages.push(`MilestoneFeatures ${ws.name}: ${msg}`);
        hasFailure = true;
      }
    }
  }

  // 2.7 Capacity sync (Story 4): for Full or Capacity, fetch and upsert per workstream
  const shouldSyncCapacity = syncType === 'Full' || syncType === 'Capacity';
  if (shouldSyncCapacity && iterationIdMap.size > 0) {
    try {
      const capacityResults = await syncCapacityFn(workstreams, sprintIdMap, iterationIdMap, {
        db: prisma,
      });

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
        await computeMetricsFn(sprintId);
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
