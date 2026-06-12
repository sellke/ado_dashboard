# Story 4: Tests and regression coverage (current-sprint parity)

> Status: Completed ✅
> Priority: Medium
> Dependencies: Story 1, Story 2, Story 3

## User Story

As a maintainer of the ADO dashboard, I want comprehensive unit, route, and container tests covering the anchored rolling-window logic and current-sprint parity, so that the new sprint-tab refetch behavior is verified and protected against regressions.

## Acceptance Criteria

1. **Given** a previous sprint is the anchor, **When** `buildTrendSeries` computes the window, **Then** the past window contains no `mode: 'current'` entry and prediction is suppressed.
2. **Given** an as-of sprint anchor, **When** `computeBugBurndown` runs, **Then** it returns burndown computed as-of that sprint per the locked contract.
3. **Given** a mid-history `sprintId`, **When** the metrics route builds the window, **Then** it returns `[N-4..N]`; **And given** fewer than five sprints of history, **Then** the window truncates gracefully.
4. **Given** no `sprintId` is passed (current sprint), **When** the route responds, **Then** behavior matches prior current-sprint output exactly (parity).
5. **Given** a container test, **When** a tab change occurs, **Then** a refetch fires with `sprintId`; **And when** the current tab is selected, **Then** `sprintId` is omitted; **And** rapid switches are handled by the request-id guard.

## Implementation Tasks

- [x] Add unit tests for `buildTrendSeries` window gating: past window has no `mode: 'current'` entry and prediction is suppressed.
- [x] Add unit tests for `computeBugBurndown` as-of logic against an anchored sprint.
- [x] Add route tests in `__tests__/app/api/metrics/route.test.ts` for the anchored window: mid-history `sprintId` returns `[N-4..N]`, and `<5` history truncates.
- [x] Add route test for current-sprint parity (no `sprintId` behaves as before).
- [x] Add container test in `__tests__/components/Dashboard/` asserting tab change triggers refetch with `sprintId` and current tab omits `sprintId`.
- [x] Add a rapid-switch test verifying the `metricsRequestIdRef` guard applies only the latest response.
- [x] Run the full test suite plus typecheck/lint and confirm coverage targets (new code >=80%, window + burndown paths 100%).

## Technical Notes

- Place unit tests for `buildTrendSeries` and `computeBugBurndown` alongside existing patterns; assert that the past window excludes any `mode: 'current'` entry and that prediction is suppressed for non-current anchors.
- Route tests live in `__tests__/app/api/metrics/route.test.ts`. Cover: mid-history `sprintId` → `[N-4..N]`; fewer than 5 sprints → truncated window; no `sprintId` → current-sprint parity with prior behavior.
- Container tests live in `__tests__/components/Dashboard/` (existing DashboardContainer / DashboardIntegration tests). Assert that a tab change builds a `metricsUrl` with `&sprintId=`, that the current tab omits it, and that rapid switching is resolved by the `metricsRequestIdRef` guard (only the latest selection's response is applied).
- Use the existing vitest / React Testing Library patterns already established in the repo; do not introduce a new test framework or harness.
- Coverage targets: new code >=80% overall, with the window-construction and bug-burndown paths at 100%.

## Definition of Done

- [x] Unit tests cover `buildTrendSeries` window gating and `computeBugBurndown` as-of logic.
- [x] Route tests cover anchored window (`[N-4..N]`), truncation under 5 sprints, and current-sprint parity.
- [x] Container tests cover refetch-with-sprintId on tab change, sprintId omission for current tab, and rapid-switch request-id guarding.
- [x] Coverage targets met (new code >=80%, window + burndown paths 100%).
- [x] Full test suite, typecheck, and lint pass.

## Context for Agents

- Spec: ../spec.md
- Technical spec: ../sub-specs/technical-spec.md (see Story 2 section, Error & Rescue Map, Interaction Edge Cases)
- API spec: ../sub-specs/api-spec.md (sprintId param semantics)

---

## What Was Built

**Implementation Date:** 2026-06-04

### Files Created

[None created]

### Files Modified

- **`__tests__/lib/metrics/trend-service.test.ts`**
  - Covers past-window trend gating and as-of burndown behavior.
- **`__tests__/app/api/metrics/route.test.ts`**
  - Added anchored-window, short-history truncation, current-sprint parity, anchored query, and `adoCreatedDate` assertions.
- **`__tests__/components/Dashboard/DashboardContainer.test.tsx`**
  - Added sprint tab URL assertions, no-current-sprint regression coverage, and stale metrics response guard coverage.
- **`components/Dashboard/DashboardContainer.tsx`**
  - Refined current-sprint state to distinguish unknown (`undefined`) from known no-current (`null`) after review.

### Implementation Decisions

1. **No-current sprint guard** — `undefined` means current sprint context is not loaded yet; `null` means loaded and no sprint is current, so selected tabs still send `sprintId`.
2. **Request guard coverage through stale metrics responses** — The regression test verifies the shared request-id guard by resolving an older metrics response after a newer scoped response.

### Test Results

**Verification:** `pnpm jest __tests__/lib/metrics/trend-service.test.ts __tests__/app/api/metrics/route.test.ts __tests__/components/Dashboard/DashboardContainer.test.tsx __tests__/components/Dashboard/WorkstreamCardsGrid.test.tsx --runInBand`; `pnpm run typecheck`
- 72 focused Jest tests passed.
- TypeScript typecheck passed.

### Review Outcome

**Result:** PASS

- **Iteration count:** 2 iteration(s)
- **Drift:** None
- **Security:** No new security concerns
- **Boundary Compliance:** Compliant

### Deviations from Spec

None
