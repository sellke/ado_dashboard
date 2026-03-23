# Story 1: Sprint-Actual Overhead % and Carry-Over %

**Spec:** [Dashboard Metrics Audit](../spec.md)  
**Story:** 1 of 5  
**Dependencies:** None  
**Priority:** High (data accuracy fix)  
> Status: Complete

## Context

When a user selects a non-current sprint via the sprint tab selector, the Overhead % and Carry-Over % metric tiles in workstream cards currently show rolling averages as-of that sprint (`overheadPercentAvg`, `carryOverRateAvg`). They should show that sprint's ACTUAL overhead % and carry-over rate.

## User Story

As a program lead reviewing historical sprint data, I want the Overhead % and Carry-Over % tiles to show the selected sprint's actual values so that I can see what actually happened in that sprint, not a smoothed average.

## Acceptance Criteria

1. Given I select a non-current sprint tab, When the workstream cards update, Then Overhead % shows that sprint's actual overhead percentage (not rolling avg)
2. Given I select a non-current sprint tab, When the workstream cards update, Then Carry-Over % shows that sprint's actual carry-over rate (not rolling avg)
3. Given I'm on the current (default) sprint tab, When the dashboard loads, Then Overhead % and Carry-Over % show current snapshot values (existing behavior preserved)
4. Given a sprint has null overhead or carry-over data, Then the tile displays "N/A"

## Implementation Tasks

- [x] Add `rawOverheadPercent: number | null` field to `TrendSprintViewModel` in `lib/dashboard/types.ts`
- [x] Add `rawCarryOverRate: number | null` field to `TrendSprintViewModel` in `lib/dashboard/types.ts`
- [x] Map `overheadComposition.overheadPercent` → `rawOverheadPercent` in `mapTrendSprint()` in `lib/dashboard/adapter.ts`
- [x] Derive `rawCarryOverRate` from `(carryOverPoints / plannedPoints) * 100` in `mapTrendSprint()` in `lib/dashboard/adapter.ts`
- [x] Update `WorkstreamHealthCard.tsx` `displayMetrics` useMemo: use `matchedTrendSprint.rawOverheadPercent` for Overhead % (not `overheadPercentAvg`)
- [x] Update `WorkstreamHealthCard.tsx` `displayMetrics` useMemo: use `matchedTrendSprint.rawCarryOverRate` for Carry-Over % (not `carryOverRateAvg`)
- [x] Add/update tests in `__tests__/lib/dashboard/adapter.test.ts` for new fields
- [x] Add/update tests in `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` for sprint-actual override

## Technical Notes

- `overheadComposition.overheadPercent` is already available on `ApiTrendSprint` — just not mapped to a top-level view model field
- `carryOverPoints` and `plannedPoints` are already on `TrendSprintViewModel` — derive the rate in the adapter
- Handle division by zero: if `plannedPoints` is 0 or null, `rawCarryOverRate` should be null

## Definition of Done

- [x] Overhead % shows sprint-actual value when non-current sprint is selected
- [x] Carry-Over % shows sprint-actual value when non-current sprint is selected
- [x] Current sprint behavior unchanged
- [x] Null values display as "N/A"
- [x] Adapter tests pass
- [x] Component tests pass
