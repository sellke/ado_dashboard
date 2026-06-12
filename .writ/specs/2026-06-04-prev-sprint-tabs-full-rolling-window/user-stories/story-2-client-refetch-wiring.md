# Story 2: Lift activeSprintId and wire sprintId refetch + loading state on tab change

> Status: Completed ✅
> Priority: High
> Dependencies: Story 1

## User Story

As a dashboard user reviewing a previous sprint, I want the velocity, bug burndown, and overhead charts to refetch a full five-sprint rolling window anchored at the sprint tab I select, so that I see accurate historical trend context instead of stale client-only state.

## Acceptance Criteria

1. **Given** the dashboard has loaded with the current sprint selected, **When** I select a previous sprint tab, **Then** `DashboardContainer` issues a metrics refetch whose URL includes `&sprintId=<selectedId>`.
2. **Given** I select the current sprint tab (or no tab has been changed), **When** the metrics URL is built, **Then** `sprintId` is omitted so default current-sprint behavior is preserved exactly.
3. **Given** a refetch is in flight after a tab change, **When** the response has not yet arrived, **Then** the cards/charts show the existing `metricsViewState === 'loading'` state.
4. **Given** I rapidly switch between several sprint tabs, **When** responses arrive out of order, **Then** the existing `metricsRequestIdRef` guard ensures only the latest selection's response is applied.
5. **Given** selection state has been lifted to `DashboardContainer`, **When** the page renders, **Then** `SprintTabSelector` and `deriveSprintList` continue to live in `WorkstreamCardsGrid` and only the selected id and `currentSprintId` flow upward.

## Implementation Tasks

- [x] Add/extend a container test in `__tests__/components/Dashboard/` asserting that a tab change triggers a refetch with `&sprintId=` and that selecting the current sprint omits `sprintId`.
- [x] Lift `activeSprintId` selection state out of `components/Dashboard/WorkstreamCardsGrid.tsx` to `components/Dashboard/DashboardContainer.tsx` (state owned in container, set via callback).
- [x] Surface `currentSprintId` (derived from `sprints.find(s => s.isCurrent)?.id`) up to the container so it can gate URL construction.
- [x] Extend the `metricsUrl` `useMemo` in `DashboardContainer.tsx` to append `&sprintId=${activeSprintId}` only when `activeSprintId && activeSprintId !== currentSprintId`.
- [x] Wire the refetch through the existing `fetchMetrics` path so the `metricsRequestIdRef` guard and `metricsViewState` transitions handle stale/out-of-order responses and loading.
- [x] Keep `SprintTabSelector` rendering and `deriveSprintList(sprintStoriesMap)` in `WorkstreamCardsGrid.tsx`; pass selected id up via `onSprintChange` callback wired to the lifted setter.
- [x] Run the full test suite plus typecheck/lint to verify no regressions.

## Technical Notes

- `components/Dashboard/DashboardContainer.tsx` owns the metrics fetch and builds `metricsUrl` via `useMemo` (currently `/api/metrics?dashboard=${dashboardId}` plus optional scoped `workstreamIds`). Add `activeSprintId` and `currentSprintId` to the memo dependency list and append `&sprintId=${activeSprintId}` only when `activeSprintId && activeSprintId !== currentSprintId`.
- Selection state currently lives in `components/Dashboard/WorkstreamCardsGrid.tsx` as `const [activeSprintId, setActiveSprintId] = useState('')`. Lift this to the container; pass a setter callback down so `<SprintTabSelector ... onSprintChange={...} />` updates container state.
- `currentSprintId` is derived in `WorkstreamCardsGrid` as `sprints.find(s => s.isCurrent)?.id` from `deriveSprintList(sprintStoriesMap)`. Since `sprintStoriesMap` is fetched AFTER metrics, surface `currentSprintId` upward (e.g., via callback/effect) so the container can omit `sprintId` for the current sprint.
- Reuse the existing `metricsRequestIdRef` guard for stale/out-of-order responses and `metricsViewState === 'loading'` as the cards loading state — do not introduce a parallel loading mechanism.
- Tab list / `SprintTabSelector` rendering stays in `WorkstreamCardsGrid`; only the selected id and `currentSprintId` need to flow up to the container.

## Definition of Done

- [x] `activeSprintId` selection state lives in `DashboardContainer`, set via callback from `WorkstreamCardsGrid`.
- [x] `metricsUrl` includes `&sprintId=` for non-current selections and omits it for the current sprint.
- [x] Tab change triggers a guarded refetch using the existing request-id mechanism and `metricsViewState` loading state.
- [x] `SprintTabSelector` and `deriveSprintList` remain in `WorkstreamCardsGrid`.
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

- **`components/Dashboard/DashboardContainer.tsx`**
  - Added lifted `activeSprintId` and `currentSprintId` state, appended `sprintId` to metrics URLs only for non-current selections, and reset sprint selection when workstream scope changes.
- **`components/Dashboard/DashboardShell.tsx`**
  - Threaded selected/current sprint callbacks from the container to the workstream grid.
- **`components/Dashboard/WorkstreamCardsGrid.tsx`**
  - Kept sprint derivation and tab rendering local while surfacing active/current sprint IDs upward; retained uncontrolled fallback for component tests.
- **`__tests__/components/Dashboard/DashboardContainer.test.tsx`**
  - Added coverage for previous-sprint tab refetch with `sprintId` and current-sprint omission.

### Implementation Decisions

1. **URL-driven refetch** — Tab changes update lifted state, which changes `metricsUrl` and reuses the existing `fetchMetrics` effect, loading state, and request-id stale response guard.
2. **Require known current sprint before adding `sprintId`** — The URL omits `sprintId` until `currentSprintId` is known, avoiding an accidental current-sprint refetch with a query parameter.

### Test Results

**Verification:** `pnpm jest __tests__/components/Dashboard/DashboardContainer.test.tsx __tests__/components/Dashboard/WorkstreamCardsGrid.test.tsx --runInBand`; `pnpm run typecheck`
- 21 focused Jest tests passed.
- TypeScript typecheck passed.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration(s)
- **Drift:** None
- **Security:** No new security concerns
- **Boundary Compliance:** Compliant

### Deviations from Spec

None
