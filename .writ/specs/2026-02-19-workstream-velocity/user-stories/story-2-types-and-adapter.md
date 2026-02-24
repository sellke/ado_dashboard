# Story 2: Dashboard Types and Adapter Extension

> **Status:** Amended — Additional Tasks Pending 🔄
> **Priority:** High
> **Dependencies:** Story 1 (API extension)

## User Story

**As a** dashboard UI developer
**I want to** have typed view models for velocity rate, per-sprint bugs, and per-workstream prediction
**So that** chart and list components can render the new data with type safety

## Acceptance Criteria

- [x] Given the API returns a `prediction` field per workstream, when the adapter maps it, then `WorkstreamCardViewModel` includes `prediction: { velocity: string, rawVelocity: number | null, velocityRate: string, rawVelocityRate: number | null, sprintLabel: string, isPredicted: true }` ✅
- [x] Given the API returns `bugs` arrays in trend sprints, when the adapter maps them, then `TrendSprintViewModel` includes `bugs: TrendBugViewModel[]` with `{ adoId: string, title: string, isClosed: boolean }` ✅
- [x] Given velocity rate is available from the API, when the adapter builds workstream card metrics, then a 4th MetricTileViewModel is added with label "Velocity Rate", unit "pts/hr", and no RAG ✅
- [x] Given a workstream with null or missing velocity rate data, when the adapter maps it, then the velocity rate tile shows "N/A" ✅
- [x] Given all new types are defined, when TypeScript compiles, then there are zero type errors ✅

## Implementation Tasks

- [x] 2.1 Write tests for adapter mapping of velocity rate tile, prediction, and bug view models ✅
- [x] 2.2 Add `TrendBugViewModel` type to `lib/dashboard/types.ts`: `{ adoId: string, title: string, isClosed: boolean }` ✅
- [x] 2.3 Extend `ApiTrendSprint` with `bugs?: Array<{ adoId: number, title: string, state: string }>` in types.ts ✅
- [x] 2.4 Add `prediction` field to `ApiWorkstream` type: `{ velocity: number | null, velocityRate: number | null, mode: 'predicted', formula: string }` ✅
- [x] 2.5 Extend `TrendSprintViewModel` with `bugs: TrendBugViewModel[]` ✅
- [x] 2.6 Add `prediction` field to `WorkstreamCardViewModel`: `{ velocity: string, rawVelocity: number | null, velocityRate: string, rawVelocityRate: number | null, sprintLabel: string, isPredicted: boolean }` ✅
- [x] 2.7 Update adapter to insert Velocity Rate tile at index 1 (between Velocity and Overhead %) using `ws.prediction?.velocityRate` ✅
- [x] 2.8 Update `mapTrendSprint()` to map bugs from API format to `TrendBugViewModel` (convert `state` to `isClosed` using DONE_STATES check) ✅
- [x] 2.9 Add prediction mapping in `mapApiResponseToDashboardViewModel()` for each workstream card ✅
- [x] 2.10 Run full test suite to verify no regressions ✅

## Notes

- `DONE_STATES` from `lib/metrics/types.ts` defines closed states: ['Closed', 'Done', 'Resolved']
- The velocity rate metric tile should be inserted between Velocity and Overhead % in the METRIC_LABELS array
- Velocity rate value needs special formatting: `X.XX pts/hr` (2 decimal places) — the `formatVelocityRate()` helper already exists in adapter.ts
- For the velocity rate tile, the raw value comes from the trend service computation — it's not stored in MetricSnapshot directly
- Bug `adoId` is stored as a number in the DB but displayed as `#12345` — the string formatting happens in the component, not the adapter

## Definition of Done

- [x] All original tasks completed ✅
- [x] All original acceptance criteria met ✅
- [x] Tests passing (21/21 adapter unit tests + TypeScript compilation: zero errors) ✅
- [x] Code reviewed ✅
- [x] No type errors across the codebase ✅

---

## Amendment: Carry-Over Precision Fix & Overhead Adapter Verification (2026-02-23)

### Additional Acceptance Criteria

- [ ] Given a workstream carry-over rate value, when displayed in the metric tile, then it shows 2 decimal places (e.g., `12.34%` not `12%`)
- [ ] Given overhead % data is fixed in Story 1, when the adapter maps it, then the overhead % metric tile correctly receives and displays the real value
- [ ] Given new `OverheadBreakdownItem` types are defined (Story 6 feeds these), when adapter maps overhead breakdown data, then `TrendSprintViewModel` includes `overheadBreakdown: OverheadBreakdownItem[]`

### Additional Implementation Tasks

- [ ] 2.11 Change carry-over % display format from whole number to 2 decimal places — update `formatCarryOverRate()` or equivalent formatter in `adapter.ts` to use `toFixed(2)`
- [ ] 2.12 Verify that overhead % adapter mapping correctly passes the fixed value from Story 1 to the metric tile — update tests with non-null fixture values
- [ ] 2.13 Add `OverheadBreakdownItem` type to `lib/dashboard/types.ts`: `{ category: 'Meetings' | 'Spikes' | 'Bugs' | 'Support', hours: number }` (prerequisite for Story 7)
- [ ] 2.14 Extend `ApiTrendSprint` with `overheadBreakdown?: OverheadBreakdownItem[]` (prerequisite for Story 7 API mapping)
- [ ] 2.15 Extend `TrendSprintViewModel` with `overheadBreakdown: OverheadBreakdownItem[]` and update `mapTrendSprint()` adapter function

### Notes (Amendment)

- `formatCarryOverRate()` may not exist as a named helper — locate the carry-over % formatting in the adapter and update it in place
- The `OverheadBreakdownItem` type additions are prerequisites for Story 7 and should be done before that story begins
- Keep the `'Meetings' | 'Spikes' | 'Bugs' | 'Support'` union type as a named type alias for reuse
