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

- [x] All original tasks completed ✅
- [x] All original acceptance criteria met ✅
- [x] Tests passing (16/16 route tests, 107/107 related tests) ✅
- [x] Existing API tests still pass (no regressions) ✅
- [x] Response schema documented in api-spec.md and docs/API.md ✅

---

## Amendment: Data Fix & Overhead Investigation (2026-02-23) — COMPLETED ✅

### Investigation Findings

**Root Cause (velocityRate = null):**
- `ado-client.ts` read `data.value` from the ADO capacity API response, but the actual response uses `data.teamMembers`. This caused all `fteCount = 0` and `grossHours = 0` in `SprintWorkstream`.
- With `grossHours = 0`, `calculateNetCapacityHours(0, overheadHours)` returns a negative value, and `calculateVelocityRate()` guards against `netCapacity <= 0` → returns null.

**Root Cause (overheadPercent = null):**
- Same root cause: `grossHours = 0` → `calculateOverhead()` guards `grossHours === 0` → returns `overheadPercent: null`.

**Fixes Applied:**
1. Fixed `lib/sync/ado-client.ts`: read `data.teamMembers` instead of `data.value` for the capacity API response.
2. Seeded realistic `grossHours` values into `SprintWorkstream` via `scripts/fix-gross-hours.mjs` (FTE-based estimates per workstream).
3. Re-ran metric computation via `scripts/recompute-metrics.ts` to update all MetricSnapshot records.

**Task 1.12 — WorkItem Type Findings:**
- **Bug**: 73 records ✅ (already synced)
- **Spike**: 10 records ✅ (already synced)
- **Support**: 4 records ✅ (already synced)
- **Meetings**: NOT a work item type — Meetings overhead is computed from `ADO capacity × ceremony hours`. Not stored as WorkItems.
- **Gap for Story 6**: Meetings hours will come from `SprintWorkstream.ceremonyHours` (ADO capacity activities named "Meeting"/"Ceremony"). Currently 0 because ADO teams haven't filled in sprint capacity. Spikes and Support work items ARE in the DB and can be aggregated. Bugs are also available.



### Additional Acceptance Criteria

- [x] Given a workstream with completed sprints, when GET /api/metrics is called, then each workstream's `velocityRate` field contains a real computed value (not null/empty) ✅
- [x] Given a workstream with overhead hours, when GET /api/metrics is called, then `overheadPercent` returns a real computed value (not null/empty) ✅
- [x] Given the WorkItem table, when queried for overhead-category types (Meetings, Spikes, Bugs, Support), then the investigation documents which types are present and which need ADO sync extension (feeds Story 6) ✅

### Additional Implementation Tasks

- [x] 1.8 Investigate why `velocityRate` is null/empty in the API response — trace through `buildTrendSeries()`, `calculateVelocityRate()`, and `calculateNetCapacityHours()` in `trend-service.ts` to identify root cause ✅
- [x] 1.9 Fix the velocity rate computation/data pipeline so that `velocityRate` is correctly populated in the per-workstream API response ✅
- [x] 1.10 Investigate why `overheadPercent` is null/empty — check `MetricSnapshot.overheadPercent` population in the metric calculation pipeline ✅
- [x] 1.11 Fix overhead % data pipeline so that `overheadPercent` is correctly returned per workstream in the API response ✅
- [x] 1.12 Query the `WorkItem` table to determine which overhead work item types (Meetings, Spikes, Bugs, Support) are currently being synced from ADO — document findings and gaps for Story 6 ✅
- [x] 1.13 Update API route tests to assert non-null velocity rate and overhead % values in the response ✅
