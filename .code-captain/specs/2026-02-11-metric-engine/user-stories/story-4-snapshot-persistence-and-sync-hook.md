# Story 4: Snapshot Persistence and Sync Orchestrator Hook

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1 (MetricSnapshot table), Story 2 (calculators), Story 3 (RAG + aggregation)

## User Story

**As a** system operator
**I want to** have metrics automatically computed and stored after each ADO sync
**So that** the dashboard always shows fresh, pre-computed metrics without on-the-fly calculation delays

## Acceptance Criteria

- [ ] Given metric results for a sprint/workstream, when persisting snapshots, then they are upserted by (sprintId, workstreamId, metricName) composite key
- [ ] Given metrics already exist for a sprint, when re-running computation, then existing snapshots are updated (not duplicated)
- [ ] Given a successful ADO sync completes, when the sync orchestrator finishes, then metric computation is triggered automatically
- [ ] Given metric computation fails, when the sync orchestrator hook runs, then the sync is still considered successful (metrics are best-effort)
- [ ] Given a rolling 5-sprint window, when computing metrics, then all sprints in the window are recomputed (not just current)
- [ ] Given 4 workstreams, when computing program-level metrics, then program snapshots (workstreamId = null) are created

## Implementation Tasks

- [ ] 4.1 Write tests for MetricSnapshot upsert logic (create, update, idempotent, program-level)
- [ ] 4.2 Implement `lib/metrics/snapshot.ts` -- upsertSnapshot(prisma, snapshotInput) with composite key upsert
- [ ] 4.3 Write tests for metric engine pipeline (data fetch -> calculate -> RAG -> rolling avg -> aggregate -> persist)
- [ ] 4.4 Implement `lib/metrics/engine.ts` -- computeAndPersistMetrics(prisma, options?) orchestrator function
- [ ] 4.5 Write tests for sync hook integration (success triggers metrics, failure does not block sync)
- [ ] 4.6 Add metric computation hook to `lib/sync/orchestrator.ts` -- call engine after SyncLog Success
- [ ] 4.7 Verify end-to-end: sync -> metric computation -> snapshots persisted with correct RAG and rolling averages

## Notes

- The engine is the central orchestrator for metric computation:
  1. Determine sprint window (rolling 5 from Sprint table, ordered by startDate DESC)
  2. For each sprint + workstream: query WorkItems, query SprintWorkstream capacity
  3. Run all 4 calculators (velocity, overhead, predictability, carry-over)
  4. Evaluate RAG for each metric
  5. Compute rolling averages from prior sprint snapshots
  6. Compute program-level aggregates
  7. Upsert all MetricSnapshots
- Sync hook is BEST-EFFORT: if metric computation throws, log the error but don't fail the sync
- Engine accepts optional `sprintIds` param to recompute specific sprints (useful for backfill)
- Current sprint IS included in snapshots (for projection) but excluded from rolling averages of other sprints

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing (snapshot upsert, engine pipeline, sync hook)
- [ ] Code reviewed
- [ ] No linter errors
- [ ] Sync orchestrator correctly triggers metric computation
