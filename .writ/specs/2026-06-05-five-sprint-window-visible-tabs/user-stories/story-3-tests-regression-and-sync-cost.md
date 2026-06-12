# Story 3 — Tests, Regression Parity, and Sync-Cost Sanity

> **Status:** Complete
> **Priority:** Medium
> **Dependencies:** Story 1, Story 2

## User Story

**As a** dashboard maintainer,
**I want** the deepened ingestion proven end to end and protected against regressions,
**So that** every visible tab stays fully backed and the design can't silently break later.

## Acceptance Criteria

1. **Given** ≥ 9 sprints of data, **when** the oldest visible tab is selected, **then** all
   three charts (velocity, bug burndown, overhead) render a full five-sprint window.
2. **Given** fewer than 9 sprints exist, **when** any visible tab is selected, **then** its
   window truncates to available sprints with no padding and no error.
3. **Given** the constants and routes, **when** the guard test runs, **then** it fails if
   `INGEST_SPRINT_DEPTH ≠ VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH − 1` or if a route `take`
   diverges from its constant.
4. **Given** the existing suite, **when** tests run, **then** metrics-route and trend-service
   tests pass unchanged (current-sprint parity).

## Implementation Tasks

- [x] Integration test: with ≥ 9 sprints seeded, `/api/metrics?sprintId=<oldest visible>`
      returns a 5-sprint window; tab count from `/api/sprints/stories` stays 5.
- [x] Degradation tests: 5 / 6 / 8 sprints → truncated windows, never padded, no throw.
- [x] Guard test for the constant relationship and route `take` alignment (if not already in
      Story 1/2).
- [x] Sync-cost sanity: assert the orchestrator issues work-item/capacity work for 9 (not 5)
      sprints and note timing; flag if the increase looks unacceptable for follow-up.
- [x] Run focused route/sync/typecheck/trend regression tests; confirm green. Full
      `sync-ado` endpoint file still has two existing real-sync success expectations that fail
      outside the isolated orchestrator test.

## Technical Notes

- Reuse existing metrics-route test fixtures/seed patterns; extend to ≥ 9 sprints for the
  full-window case.
- "Sync-cost sanity" is a guardrail check, not a benchmark — confirm scope (9 sprints) and
  surface concern if needed; the optimization fallback is out of scope (spec → Known
  Limitations).

## Definition of Done

- [x] All acceptance criteria met.
- [x] Full-window, degradation, and guard tests added and green.
- [x] Existing metrics-route/trend-service tests pass unchanged.
- [x] Coverage: selection/constant + degradation paths covered by focused tests; no coverage
      percentage report was generated.

## Context for Agents

- Implementation map: technical-spec §5 (Test Strategy) and §4 (Error & Rescue Map).
- Files: `__tests__/lib/sync/iterations.test.ts`, `__tests__/lib/sync/orchestrator.test.ts`,
  `__tests__/app/api/metrics/route.test.ts`, constant guard test.
- Shadow paths: happy (≥9), nil/empty iterations, upstream fetch error (technical-spec §4).
