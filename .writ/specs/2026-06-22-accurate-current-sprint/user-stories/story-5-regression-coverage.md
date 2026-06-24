# Story 5: Regression Coverage

> **Status:** Not Started
> **Priority:** Normal
> **Dependencies:** Stories 1–4

## User Story

**As a** developer,
**I want** integration and regression tests that lock cross-layer current-sprint consistency from sync through metrics computation to dashboard default load,
**So that** divergent date-range checks, stale ADO flags, and latest-snapshot default sprint selection cannot regress after Stories 1–4 ship.

## Acceptance Criteria

1. [ ] **Given** sync persists `isCurrent` on the resolved winner, **when** `/api/metrics` is called with no `sprintId`, **then** the default loaded sprint matches the resolver output — not the sprint with the latest `metricSnapshot.computedAt`.
2. [ ] **Given** a stale `isCurrent` flag (`endDate < now`) and a valid in-range sprint exists, **when** sync, metrics API, and snapshot computation each resolve current sprint, **then** all three layers agree on the same sprint ID.
3. [ ] **Given** a sprint-gap weekend (no active date range, most recent past sprint is current), **when** metrics API and stories API respond, **then** `rollingWindow.currentSprintId` and per-sprint `isCurrent` flags mark the gap winner consistently.
4. [ ] **Given** overlapping sprint date ranges with one flagged `isCurrent`, **when** resolver runs across layers, **then** the flagged sprint wins (or max `startDate` among flagged when multiple valid flags).
5. [ ] **Given** the dashboard loads with no `sprintId` query param, **when** the initial metrics fetch completes, **then** the selected sprint tab corresponds to `rollingWindow.currentSprintId` from the resolver-backed API response.
6. [ ] **Given** an explicit `sprintId` param, **when** the metrics route responds, **then** `isCurrentSprint` is computed via resolver comparison (winner ID === loaded sprint ID), not date range alone.

## Implementation Tasks

- [ ] **5.1** Ensure `__tests__/lib/sprint/resolve-current.test.ts` exhaustively covers all priority rules, stale flag, gap, overlap, all-past window, and empty input (extend Story 1 tests if gaps found during regression authoring).
- [ ] **5.2** Extend `__tests__/lib/sync/iterations.test.ts`: assert `isCurrent` persistence on upsert, single winner after sync, and `selectRollingSprints` returns `currentSprint` consistent with resolver anchor index.
- [ ] **5.3** Extend `__tests__/app/api/metrics/route.test.ts`: default sprint uses resolver (not latest snapshot); stale-flag and gap scenarios; `rollingWindow.currentSprintId` and `isCurrentSprint` alignment; explicit `sprintId` still honored.
- [ ] **5.4** Extend `__tests__/app/api/sprints/stories/route.test.ts`: per-sprint `isCurrent` flags match resolver output for gap, overlap, and stale-flag fixtures.
- [ ] **5.5** Extend `__tests__/lib/metrics/snapshot.test.ts` (or add cross-layer helper test): verify snapshot `isCurrentSprint` gate matches resolver for the same sprint set seeded in DB.
- [ ] **5.6** Add dashboard integration coverage in `__tests__/components/Dashboard/DashboardContainer.test.tsx` and/or `__tests__/app/dashboard/page.test.tsx`: default load (no `sprintId` in fetch URL) selects the resolver-backed current sprint tab when API returns `currentSprintId`.
- [ ] **5.7** Add a cross-layer consistency test (single file or shared fixture) that seeds sprints with mixed flags/dates, runs resolver expectations, and asserts sync output shape + API response fields + snapshot gate would all pick the same ID.
- [ ] **5.8** Run focused regression suites for resolver, sync, metrics route, stories route, snapshot, and dashboard container; confirm full related test files pass.
- [ ] **5.9** Verify all acceptance criteria are met and document any deferred coverage (e.g., live ADO sync E2E) before marking complete.

## Technical Notes

- This story is primarily test coverage; do not add production code unless a test reveals a real defect in Stories 1–4.
- Reuse shared sprint fixtures (dates, `isCurrent` flags, `now` injection) across resolver, sync, API, and snapshot tests to avoid drift — consider a small `__tests__/fixtures/current-sprint-scenarios.ts` helper if duplication exceeds three files.
- Dashboard default sprint test: mock metrics API response with `rollingWindow.currentSprintId` set to the gap winner; assert `DashboardContainer` initial tab / fetch URL omits `sprintId` only when loaded sprint is the current one (preserve existing tab-refetch contract from `2026-06-04-prev-sprint-tabs`).
- Metrics default sprint fallback (resolver null → latest snapshot) should retain a dedicated API test — do not remove snapshot fallback behavior.
- Pre-migration rows (`isCurrent=false` everywhere) should have one regression case proving date-range fallback until next sync.
- Mock `Date` or pass fixed `now` into resolver calls in unit tests; avoid flaky boundary tests around midnight UTC unless explicitly testing timezone note from spec.
- Do not change visible tab count, rolling window depth, or UI components — assert consumption of corrected API flags only.

## Context for Agents

- **Error map rows:** Metrics default sprint (no sprints → empty; resolver null + snapshots → fallback); Stale `isCurrent` in DB — from `sub-specs/technical-spec.md` → Error & Rescue Map.
- **Shadow paths:** Sync persist, Metrics default load, Stories `isCurrent` flag — from `sub-specs/technical-spec.md` → Shadow Paths.
- **Interaction edge cases:** Multiple ADO flags, overlapping dates, sprint gap, stale flag, explicit `sprintId`, pre-migration rows — from `sub-specs/technical-spec.md` → Interaction Edge Cases.
- **Business rules:** Single authoritative resolver; dashboard default uses resolver not latest snapshot — from `spec.md` → Business Rules and Detailed Requirements.
- **Success criteria:** All consumers call shared resolver; dashboard default matches ADO active sprint; edge cases covered — from `spec.md` → Success Criteria.
- **Traceability:** `sub-specs/technical-spec.md` → Traceability → Story 5 row.
- **Relevant files:** `__tests__/lib/sprint/resolve-current.test.ts`, `__tests__/lib/sync/iterations.test.ts`, `__tests__/app/api/metrics/route.test.ts`, `__tests__/app/api/sprints/stories/route.test.ts`, `__tests__/lib/metrics/snapshot.test.ts`, `__tests__/components/Dashboard/DashboardContainer.test.tsx`, `__tests__/app/dashboard/page.test.tsx`.

## Definition of Done

- [ ] All implementation tasks completed.
- [ ] All acceptance criteria verified by automated tests.
- [ ] Cross-layer current-sprint consistency locked by regression tests (sync → API → snapshot → dashboard default).
- [ ] Edge cases covered: stale flag, gap, overlap, all-past, pre-migration fallback, explicit `sprintId`.
- [ ] Existing dashboard tab-refetch and metrics response shape tests pass without regression.
- [ ] No new production code added unless fixing a defect found during test authoring.
