# Story 2: Extend Types and Adapter for Enriched Trend Data

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** frontend developer
**I want** the TypeScript types and adapter to include per-sprint rolling averages and detail fields
**So that** components can access typed, formatted per-sprint data from the existing trend sprint view models

## Acceptance Criteria

- [x] Given the enriched API response, when `ApiTrendSprint` is used, then it includes optional `velocityAvg`, `overheadPercentAvg`, `carryOverRateAvg`, `plannedPoints`, `completedPoints`, `carryOverPoints`, `grossHours` fields
- [x] Given the adapter maps a trend sprint, when `mapTrendSprint()` runs, then `TrendSprintViewModel` includes the new fields with proper formatting
- [x] Given a trend sprint with null snapshot fields, when mapped, then the view model fields are null (not "N/A" — formatting is deferred to the component)

## Implementation Tasks

- [x] 2.1 Write unit tests for the extended `mapTrendSprint()` with new fields
- [x] 2.2 Add new optional fields to `ApiTrendSprint` interface in `lib/dashboard/types.ts`
- [x] 2.3 Add corresponding fields to `TrendSprintViewModel` interface in `lib/dashboard/types.ts`
- [x] 2.4 Update `mapTrendSprint()` in `lib/dashboard/adapter.ts` to pass through the new fields
- [x] 2.5 Verify existing adapter tests still pass

## Notes

- Keep the new fields as raw numbers (not formatted strings) in the view model — the component will format them using existing helpers like `formatMetricValue`, `formatPercent`, `formatCarryOverRate`
- The fields are all `number | null` — consistent with existing nullable patterns in the types
- `velocityAvg` etc. represent rolling averages as-of that sprint, not single-sprint values

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Type safety verified (no `any` casts)
