---
# Story 2: API Contract Extension

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1 (schema + calculator must be complete)

## User Story

**As a** dashboard consumer,
**I want** the `GET /api/metrics` response to include per-sprint overhead composition and current-sprint bug/support items with hours,
**So that** the frontend can render the stacked bar chart and item tables without additional API calls.

## Acceptance Criteria

- [x] Given `GET /api/metrics` is called, when the response is returned, then each trend sprint includes an `overheadComposition` object with `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours`, `totalOverheadHours`, `overheadPercent` ✅
- [x] Given `GET /api/metrics` is called, when the response is returned, then each workstream includes `currentSprintOverheadItems` with `bugs` and `support` arrays (each item: `adoId`, `title`, `state`, `hours`) ✅
- [x] Given a workstream has no bugs or support items in the current sprint, when the response is returned, then the arrays are empty (not null) ✅
- [x] Given `hours` on an item, when `completedWork` is present, then it is used; otherwise `originalEstimate` is used; otherwise `null` ✅
- [x] Items within each array are ordered by `adoId` ascending ✅

## Implementation Tasks

- [x] 2.1 Write tests for the extended API response shape (assert `overheadComposition` on trend sprints and `currentSprintOverheadItems` on workstreams) ✅
- [x] 2.2 Extend the `trendSnapshots` query in `app/api/metrics/route.ts` to also select `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` from MetricSnapshot ✅
- [x] 2.3 Add query for current-sprint Support work items per workstream (similar to existing Bug item query) — select `adoId`, `title`, `state`, `completedWork`, `originalEstimate`, `workstreamId`, `sprintId` ✅
- [x] 2.4 Map `overheadComposition` per trend sprint from the extended snapshot data in `formatWorkstreamResponse` or the trend assembly block ✅
- [x] 2.5 Map `currentSprintOverheadItems` per workstream — bugs from existing `trendBugs` filtered to current sprint, support from new query, both with `hours = completedWork ?? originalEstimate ?? null` ✅
- [x] 2.6 Run tests to verify all API route tests pass with extended response ✅

## Notes

- `overheadComposition` data comes from the new MetricSnapshot breakdown columns (Story 1) — not re-computed from WorkItems
- `currentSprintOverheadItems` uses the snapshot's `sprintId` (same sprint the card is showing) not the live current date
- The existing `trendBugs` query already fetches bugs for all rolling sprints — filter to current sprint for `currentSprintOverheadItems.bugs`
- Support items need a new parallel query: same shape as `trendBugs` but `type: 'Support'` instead of `type: 'Bug'`, plus select `completedWork` and `originalEstimate`

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (21/21) ✅
- [x] Code reviewed ✅
- [x] API response verified against known data ✅
