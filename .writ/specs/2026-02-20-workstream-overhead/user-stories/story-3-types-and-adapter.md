---
# Story 3: Dashboard Types and Adapter

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 2 (API contract must be defined)

## User Story

**As a** frontend developer,
**I want** typed view models for overhead composition and item tables,
**So that** the `OverheadBreakdownPanel` components receive strongly-typed data mapped from the API response.

## Acceptance Criteria

- [x] Given the extended API response, when the adapter runs, then `WorkstreamCardViewModel` includes `overheadComposition: OverheadCompositionViewModel[]`, `currentSprintBugItems: OverheadItemViewModel[]`, `currentSprintSupportItems: OverheadItemViewModel[]` ✅
- [x] Given an `ApiOverheadItem` with `completedWork: 4.5`, when mapped, then `hours` displays as `"4.5 hrs"` ✅
- [x] Given an `ApiOverheadItem` with `hours: null`, when mapped, then `hours` displays as `"N/A"` ✅
- [x] Given a bug item in a closed state (`Closed`, `Done`, `Resolved`), when mapped, then `isClosed: true` ✅
- [x] Given null composition data (no breakdown columns on old snapshots), when mapped, then each chart data point uses `0` for null hour values ✅

## Implementation Tasks

- [x] 3.1 Write adapter tests for `mapOverheadComposition` and `mapOverheadItem` functions ✅
- [x] 3.2 Add new API-layer types to `lib/dashboard/types.ts`:
  - `ApiOverheadComposition` (ceremonyHours, bugHours, spikeHours, supportHours, totalOverheadHours, overheadPercent — all nullable)
  - `ApiOverheadItem` (adoId, title, state, hours — hours nullable)
  - Extend `ApiTrendSprint` with `overheadComposition?: ApiOverheadComposition`
  - Extend `ApiWorkstream` with `currentSprintOverheadItems?: { bugs: ApiOverheadItem[]; support: ApiOverheadItem[] }` ✅
- [x] 3.3 Add new view model types to `lib/dashboard/types.ts`:
  - `OverheadCompositionViewModel` (sprintName, ceremonyHours, bugHours, spikeHours, supportHours, overheadPercent: string)
  - `OverheadItemViewModel` (adoId: string formatted as "#12345", title, state, hours: string, isClosed: boolean)
  - Extend `WorkstreamCardViewModel` with `overheadComposition`, `currentSprintBugItems`, `currentSprintSupportItems` ✅
- [x] 3.4 Add `mapOverheadComposition(sprints: ApiTrendSprint[]): OverheadCompositionViewModel[]` to `lib/dashboard/adapter.ts` ✅
- [x] 3.5 Add `mapOverheadItem(item: ApiOverheadItem): OverheadItemViewModel` to `lib/dashboard/adapter.ts` — formats adoId as "#12345", hours as "X.X hrs" or "N/A", sets `isClosed` using DONE_STATES ✅
- [x] 3.6 Extend `mapApiResponseToDashboardViewModel` in adapter to populate the three new `WorkstreamCardViewModel` fields for each workstream ✅
- [x] 3.7 Update `__fixtures__/dashboard-fixtures.ts` to include sample overhead composition and item data ✅

## Notes

- `OverheadCompositionViewModel` hour fields use `number` (not string) since they feed a chart — null API values default to `0`
- `OverheadItemViewModel.adoId` is a string prefixed with `#` (e.g., `"#12345"`) — consistent with `TrendBugViewModel` in Phase 1C
- `isClosed` uses the existing `DONE_STATES` constant (`['Closed', 'Done', 'Resolved']`) imported from `lib/metrics/types`
- `formatHours(value: number | null): string` helper formats `4.5` → `"4.5 hrs"`, null → `"N/A"`

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (100%) ✅
- [x] Code reviewed ✅
- [x] TypeScript compiles without errors ✅
