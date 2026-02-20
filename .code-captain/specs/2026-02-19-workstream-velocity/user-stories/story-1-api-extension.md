# Story 1: API Data Contract Extension

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard frontend consumer
**I want to** receive per-workstream predictions and per-sprint bug item details from the metrics API
**So that** the UI can render velocity trend charts with predictions and per-sprint bug listings

## Acceptance Criteria

- [x] Given a workstream with 4+ completed sprints, when GET /api/metrics is called, then each workstream object includes a `prediction` field with `{ velocity, velocityRate, mode: 'predicted', formula }` ✅
- [x] Given a rolling window of sprints, when GET /api/metrics is called, then each trend sprint object includes a `bugs` array with `{ adoId, title, state }` for Bug-type work items ✅
- [x] Given a workstream with no bug work items in a sprint, when the response is returned, then the `bugs` array is empty `[]` ✅
- [x] Given the current sprint is in progress, when prediction is computed, then the formula uses average velocity rate × current sprint net capacity hours (matching `buildTrendSeries` logic) ✅
- [x] Given existing API consumers, when the response shape changes, then all existing fields remain unchanged (additive change only) ✅

## Implementation Tasks

- [x] 1.1 Write tests for the extended API response shape (prediction field per workstream, bugs array per trend sprint) ✅
- [x] 1.2 Add Prisma query in the API route to fetch Bug-type WorkItems per sprint per workstream for the rolling window sprints ✅
- [x] 1.3 Attach the `buildTrendSeries()` prediction result to each workstream response object (the function already computes per-workstream prediction when `workstreamId` is passed) ✅
- [x] 1.4 Map fetched bug WorkItems into the trend sprint response as `bugs: Array<{ adoId, title, state }>` grouped by sprintId ✅
- [x] 1.5 Add velocity rate for the current sprint to the workstream response (computed from the trend service or from MetricSnapshot grossHours/overheadHours/velocity) ✅
- [x] 1.6 Verify backward compatibility — run existing API route tests to confirm no regressions ✅
- [x] 1.7 Manual verification: call the endpoint and confirm new fields appear correctly ✅

## Notes

- `buildTrendSeries()` in `lib/metrics/trend-service.ts` already computes per-workstream predictions with `avgVelocityRate × netCapacityHours` — this just needs to be included in the API response
- Bug query: `prisma.workItem.findMany({ where: { type: 'Bug', sprintId: { in: rollingSprintIds }, workstreamId } })` — similar to existing `trendBugs` query but selecting `adoId, title, state` instead of just state
- The existing `trendBugs` query already fetches bugs for the rolling window — it can be extended to include additional fields rather than creating a separate query
- Keep bug arrays sorted by adoId ascending for consistent display

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (16/16 route tests, 107/107 related tests) ✅
- [x] Existing API tests still pass (no regressions) ✅
- [x] Response schema documented in api-spec.md and docs/API.md ✅
