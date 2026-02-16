# Story 3: Orchestration, Persistence & API

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1 (schema), Story 2 (all pure functions)

## User Story

**As a** system operator and dashboard frontend
**I want** metrics to be automatically computed after sync, persisted in MetricSnapshot, and accessible via API routes
**So that** the dashboard always shows fresh health data without manual steps

## Acceptance Criteria

- [x] Given a completed sync, when the sync orchestrator finishes successfully, then metric computation is triggered for all synced sprints
- [x] Given a sprint and workstream, when `computeWorkstreamMetrics()` runs, then it queries WorkItems + SprintWorkstream, calls calculators, computes rolling averages, assigns RAG, and upserts a MetricSnapshot
- [x] Given a partial sync failure (some workstreams OK, some failed), when metrics are triggered, then only successful workstreams get metric snapshots
- [x] Given a metric computation error, when it occurs, then the sync is NOT marked as failed — the error is logged separately
- [x] Given MetricSnapshot records exist, when `GET /api/metrics` is called, then it returns per-workstream metrics for the most recent completed sprint
- [x] Given a `sprintId` query param, when `GET /api/metrics?sprintId=X` is called, then it returns metrics for that specific sprint
- [x] Given `includeProgram=true` (default), when the API is called, then the response includes a `program` object with weighted aggregate metrics
- [x] Given valid sprint, when `POST /api/metrics/compute` is called, then it triggers metric computation and returns a summary

## Implementation Tasks

- [x] 3.1 Write tests for `computeWorkstreamMetrics()` in `__tests__/lib/metrics/snapshot.test.ts`: happy path (all data present), missing SprintWorkstream (overhead null), no WorkItems (all metrics null/0), error handling
- [x] 3.2 Implement `computeWorkstreamMetrics(sprintId, workstreamId)` in `lib/metrics/snapshot.ts`: query data → call calculators → rolling avg → RAG → upsert MetricSnapshot
- [x] 3.3 Write tests for `computeAllMetrics()` in `__tests__/lib/metrics/orchestrator.test.ts`: multiple workstreams, partial data, error isolation between workstreams
- [x] 3.4 Implement `computeAllMetrics(sprintId)` in `lib/metrics/orchestrator.ts`: iterate workstreams, call computeWorkstreamMetrics, handle errors per-workstream, return ComputeMetricsResult
- [x] 3.5 Add sync hook: modify `lib/sync/orchestrator.ts` to call `computeAllMetrics()` after successful sync completion (non-fatal try/catch)
- [x] 3.6 Write tests for API routes in `__tests__/app/api/metrics/route.test.ts`: GET happy path, empty data, sprintId filter, workstreamId filter, includeProgram=false; POST trigger, invalid sprintId, error handling
- [x] 3.7 Implement `GET /api/metrics` in `app/api/metrics/route.ts`: parse query params, fetch MetricSnapshots, compute program aggregate via `aggregateToProgram()`, format response
- [x] 3.8 Implement `POST /api/metrics/compute` in `app/api/metrics/compute/route.ts`: validate input, call `computeAllMetrics()`, return summary
- [x] 3.9 Verify end-to-end: seed data → sync → auto-compute → GET /api/metrics returns correct response

## Notes

**Computation pipeline per workstream (`computeWorkstreamMetrics`):**
```
1. workItems = prisma.workItem.findMany({ where: { sprintId, workstreamId } })
2. sprintWs = prisma.sprintWorkstream.findUnique({ where: { sprintId_workstreamId } })
3. velocity = calculateVelocity(workItems)
4. overhead = calculateOverhead(workItems, sprintWs)
5. { predictability, plannedPoints, completedPoints } = calculatePredictability(workItems)
6. { carryOverRate, carryOverItems, carryOverPoints } = calculateCarryOver(workItems)
7. priorSnapshots = fetch prior 4 snapshots ordered by sprint endDate desc
8. rollingAvgs = calculateRollingAverages(priorSnapshots)
9. thresholds = prisma.thresholdConfig.findMany()
10. ragColors = assign RAG for each metric
11. prisma.metricSnapshot.upsert({ where: { sprintId_workstreamId }, ... })
```

**Sync hook placement (in `lib/sync/orchestrator.ts`):**
```typescript
// After SyncLog marked Success
if (syncLog.status === 'Success') {
  try {
    await computeAllMetrics(currentSprintId);
  } catch (err) {
    console.error('Metric computation failed (non-fatal):', err);
  }
}
```

**Error isolation:** Each workstream's computation is wrapped in try/catch. A failure in one does not prevent others.

**Upsert strategy:** `prisma.metricSnapshot.upsert()` with compound unique key `{ sprintId_workstreamId: { sprintId, workstreamId } }`.

**Default sprint resolution:**
- `GET /api/metrics` (no sprintId): Most recent sprint that has ≥ 1 MetricSnapshot
- `POST /api/metrics/compute` (no sprintId): Most recent sprint by endDate

**Response formatting:** Transform flat MetricSnapshot fields into nested API shape:
```typescript
// DB: { velocity: 34, velocityAvg: 31.5, velocityRag: 'Green' }
// API: { velocity: { value: 34, avg: 31.5, rag: 'Green' } }
```

**API response shape:** See `sub-specs/api-spec.md` for full request/response documentation.

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (83 tests: 71 metric + 12 API route)
- [x] Metrics auto-computed after sync (verified end-to-end)
- [x] Error in metric computation does not fail the sync
- [x] API returns correct response shape
- [x] Error responses are well-formatted (400/404/500)
- [x] TypeScript compiles without errors
