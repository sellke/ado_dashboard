# Story 1: Emit current sprint in trend series (backend)

> **Status:** Completed ✅
> **Priority:** High
> **Effort:** Medium
> **Dependencies:** None

---

## User Story

**As a** dashboard consumer  
**I want** the trend series to include the current (in-flight) sprint  
**So that** velocity, bug, and overhead charts can show where we are right now, not just where we've been

---

## Acceptance Criteria

- [x] **Given** `buildTrendSeries` is called with a `currentSprintId` that exists in `rollingSprintsDesc`  
  **When** the function returns  
  **Then** the `sprints` array contains exactly 5 entries: 4 prior sprints (mode: `'actual'`) followed by the current sprint (mode: `'current'`)

- [x] **Given** the current sprint has a `MetricSnapshot` with a non-null velocity  
  **When** the current sprint entry is built  
  **Then** its `velocity` equals the sum of velocities from current-sprint snapshots in scope

- [x] **Given** the current sprint has no `MetricSnapshot` (null velocity)  
  **When** the current sprint entry is built  
  **Then** its `velocity` is `null` (no crash, no omission of the entry)

- [x] **Given** `mapTrendSprint` in the adapter processes a sprint with `mode: 'current'`  
  **When** it maps to `TrendSprintViewModel`  
  **Then** `isCurrent` is `true`

- [x] **Given** no active sprint exists (historical view)  
  **When** `buildTrendSeries` returns  
  **Then** `sprints` contains 4 entries as before — no regression

---

## Implementation Tasks

- [x] Add `'current'` to `TrendSprintMetrics.mode` union in `lib/metrics/trend-service.ts`
- [x] After `actualSprintsAsc` map, append current sprint entry with `mode: 'current'` (velocity, velocityRate from current-sprint snapshots; activeBugs/bugsClosed start at 0 — overridden by computeBugBurndown in route.ts)
- [x] Add `isCurrent: boolean` to `TrendSprintViewModel` in `lib/dashboard/types.ts`; add `'current'` to `ApiTrendSprint.mode` union
- [x] Update `mapTrendSprint` in `lib/dashboard/adapter.ts` to set `isCurrent: sprint.mode === 'current'`
- [x] Update `__tests__/lib/metrics/trend-service.test.ts` — add test: 5-sprint output, last entry is `mode: 'current'`
- [x] Update `__tests__/lib/dashboard/adapter.test.ts` — add test: `isCurrent: true` when mode is `'current'`

---

## Technical Notes

- `buildTrendSeries` currently: `rollingSprintsDesc.filter((s) => s.id !== selectedCurrentSprintId).slice(0, 4).reverse()` — the filter excludes current sprint. Change: keep filter for `actualSprintsAsc` (4 prior), then push current sprint separately at the end.
- Current sprint's `activeBugs`/`bugsClosed` should be initialized to `0` — they are overwritten by `computeBugBurndown` in `route.ts` which receives the full sprint list including current sprint (via the returned `sprints` array which now includes it).
- `TrendSeriesResult` shape is unchanged — `sprints: TrendSprintMetrics[]` already accommodates the new entry.
- The `velocityRate` for the current sprint uses `calculateVelocityRate(currentVelocity, currentNetCap)` — same formula as prior sprints.
- No DB query changes in `route.ts` — `trendSnapshots` already fetches all `rollingSprintIds` including the current sprint.

---

## Definition of Done

- [x] `buildTrendSeries` emits 5 entries (4 actual + 1 current) when a current sprint exists
- [x] Current sprint entry has `mode: 'current'`, prior sprints remain `mode: 'actual'`
- [x] `TrendSprintViewModel.isCurrent` correctly set by adapter
- [x] No TypeScript errors (`tsc --noEmit`)
- [x] Existing trend-service and adapter tests continue to pass
- [x] New tests added for current-sprint emission and `isCurrent` mapping

---

## Context for Agents

- **Spec:** `.writ/specs/2026-04-08-current-sprint-chart-visibility/spec.md`
- **Key file:** `lib/metrics/trend-service.ts` — `buildTrendSeries` function, line ~179 where `actualSprintsAsc` is built
- **Filter to keep:** `rollingSprintsDesc.filter((s) => s.id !== selectedCurrentSprintId).slice(0, 4).reverse()` — keep this for the 4 prior sprints; then append current sprint after the `.map()`
- **Current sprint lookup:** `const currentRef = rollingSprintsDesc.find((s) => s.id === selectedCurrentSprintId);`
- **Snapshot lookup:** `const currentSnapshots = scopeSnapshots.filter((s) => s.sprintId === currentRef.id);`
- **Type files:** `lib/dashboard/types.ts` (`ApiTrendSprint`, `TrendSprintViewModel`), `lib/metrics/trend-service.ts` (`TrendSprintMetrics`)
- **Adapter:** `lib/dashboard/adapter.ts` — `mapTrendSprint` function, adds `isCurrent` field
