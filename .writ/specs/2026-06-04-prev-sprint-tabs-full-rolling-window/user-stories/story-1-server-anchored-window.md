# Story 1: Server-side sprint-anchored rolling window + forecast suppression for past windows

> Status: Completed ✅
> Priority: High
> Dependencies: None

## User Story

As an engineering manager reviewing a previous sprint tab on the ADO dashboard, I want the velocity, bug burndown, and overhead charts to show the full five-sprint rolling window ending at (and including) the sprint I selected, so that I see the trend as it actually was at that point in time rather than always the latest five sprints.

## Acceptance Criteria

1. **Given** a `sprintId` query param resolving to a past sprint, **When** `/api/metrics` builds the rolling window, **Then** it returns up to 5 sprints whose `startDate <= sprint.startDate`, ordered `startDate desc`, ending at (and including) the selected sprint.
2. **Given** a past sprint is selected (the resolved `sprint` is not the live current-sprint window so `currentSprintId` is null), **When** `buildTrendSeries` runs, **Then** every returned sprint is emitted with `mode: 'actual'`, no trailing `mode: 'current'` entry is appended, and the prediction/forecast is null/suppressed.
3. **Given** the live current sprint is selected (default, no `sprintId` or `sprintId` equal to the current window), **When** metrics are built, **Then** the rolling window, the appended `mode: 'current'` entry, the forecast overlay, and the hollow dot behave exactly as before this change.
4. **Given** fewer than 5 sprints exist at or before the selected sprint, **When** the window is built, **Then** only the available sprints (up to 5) are returned without error.
5. **Given** any selected window, **When** `buildTrendSeries` resolves `selectedCurrentSprintId`, **Then** it does NOT fall back to `rollingSprintsDesc[0]` when `currentSprintId` is null.

## Implementation Tasks

- [x] Write/extend `buildTrendSeries` unit tests covering: past window (null `currentSprintId`) emits all-actual with no current entry and null prediction; live current window preserves appended current entry + forecast; no fallback to `rollingSprintsDesc[0]`.
- [x] Change the rolling-window query in `app/api/metrics/route.ts` to anchor on the resolved sprint: `where: { startDate: { lte: sprint.startDate } }, orderBy: { startDate: 'desc' }, take: 5`.
- [x] In `lib/metrics/trend-service.ts`, set `selectedCurrentSprintId = params.currentSprintId ?? null` (remove the `rollingSprintsDesc[0]?.id` fallback).
- [x] In `buildTrendSeries`, when `selectedCurrentSprintId` is null, emit all (up to 5) `rollingSprintsDesc` reversed as `mode: 'actual'`, skip the appended `mode: 'current'` entry, and set prediction to null/suppressed.
- [x] Verify the live current-sprint path is unchanged: `actualSprintsAsc` filtering, the trailing `mode: 'current'` entry, and the forecast/prediction still apply only when `selectedCurrentSprintId` is non-null.
- [x] Confirm the hollow-dot / forecast-overlay behavior from `2026-04-08-current-sprint-chart-visibility` is gated to the live current window only.
- [x] Run the test suite + typecheck and confirm all pass.

## Technical Notes

- `app/api/metrics/route.ts`: today `rollingSprints` is `prisma.sprint.findMany({ orderBy: { startDate: 'desc' }, take: 5 })` — replace with `prisma.sprint.findMany({ where: { startDate: { lte: sprint.startDate } }, orderBy: { startDate: 'desc' }, take: 5 })`. `sprint` is already the resolved sprint (default latest-with-snapshot, or the `sprintId` query param).
- `currentSprintId` = the window sprint whose `[startDate, endDate]` contains `now`; for a past window this is null because the selected window does not contain `now`.
- `lib/metrics/trend-service.ts`: replace `selectedCurrentSprintId = params.currentSprintId ?? rollingSprintsDesc[0]?.id ?? null` with `selectedCurrentSprintId = params.currentSprintId ?? null`.
- Live path (unchanged): `actualSprintsAsc = rollingSprintsDesc.filter(s => s.id !== selectedCurrentSprintId).slice(0, 4).reverse()`, then append the trailing `mode: 'current'` entry with the forecast/prediction.
- Past path (new): when `selectedCurrentSprintId` is null, use all `rollingSprintsDesc` reversed as `mode: 'actual'`, append no current entry, and suppress the prediction (null).
- Must preserve the live current-sprint behavior (forecast overlay + hollow dot) defined by the completed `2026-04-08-current-sprint-chart-visibility` spec — only gate it so it never applies to past windows.

## Definition of Done

- [x] Rolling-window query anchors on `sprint.startDate` (`lte`, desc, take 5) ending at the selected sprint.
- [x] Past windows emit all-actual sprints with no appended current entry and null/suppressed prediction.
- [x] No fallback to `rollingSprintsDesc[0]` when `currentSprintId` is null.
- [x] Live current-sprint window behavior (forecast overlay + hollow dot) is byte-for-byte unchanged.
- [x] Tests + typecheck pass.

## Context for Agents

- Spec: ../spec.md
- Technical spec: ../sub-specs/technical-spec.md  (see Story 1 / Story 3 sections, Error & Rescue Map, Shadow Paths)
- Key business rules: window = startDate <= selected.startDate desc take 5; forecast only when selected == live current sprint; as-of open formula above.

---

## What Was Built

**Implementation Date:** 2026-06-04

### Files Created

[None created]

### Files Modified

- **`app/api/metrics/route.ts`**
  - Anchored the rolling sprint query to the resolved sprint's `startDate` so past `sprintId` selections return the window ending at the selected sprint.
- **`lib/metrics/trend-service.ts`**
  - Removed the fallback from null `currentSprintId` to the newest rolling sprint and made historical windows emit all returned sprints as actuals.
- **`__tests__/lib/metrics/trend-service.test.ts`**
  - Updated null-current-window coverage to assert five actual sprints, no current entry, and null prediction velocity.
- **`__tests__/app/api/metrics/route.test.ts`**
  - Added anchored-query assertion and updated historical-window prediction expectation to null velocity.

### Implementation Decisions

1. **Stable API prediction shape** — Kept the existing prediction object shape while setting `velocity: null` for historical windows, which suppresses the forecast overlay without changing consumers that expect a `prediction` key.
2. **Null means no live current sprint** — `buildTrendSeries` now treats `currentSprintId: null` as an explicit historical-window signal.

### Test Results

**Verification:** `pnpm jest __tests__/lib/metrics/trend-service.test.ts __tests__/app/api/metrics/route.test.ts --runInBand`; `pnpm run typecheck`
- 45 focused Jest tests passed.
- TypeScript typecheck passed.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration(s)
- **Drift:** Small
- **Security:** No new security concerns
- **Boundary Compliance:** Compliant

### Deviations from Spec

- **[DEV-001] Stable prediction object for suppressed forecasts** — Severity: Small
  - Spec said: Forecast/prediction should be null/suppressed for past windows.
  - Reality: The API retains the existing prediction object shape but sets forecast velocity to `null`, which suppresses chart rendering.
  - Resolution: Accepted as shape-preserving behavior consistent with existing consumers.
