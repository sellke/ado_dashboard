# Story 4: State Coverage and Regression Tests

> **Status:** Complete
> **Priority:** Normal
> **Dependencies:** Stories 1, 2, and 3
> **Spec:** `.writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md`

---

## User Story

**As a** developer hardening the Dashboard workstream scope feature,
**I want** focused regression coverage for storage, modal, fetch, dashboard separation, and aggregate consistency states,
**So that** defaults, reload persistence, error recovery, and scoped Dashboard/export behavior remain stable as the feature evolves.

---

## Acceptance Criteria

- [x] Given no saved browser-local scope exists, when the Dashboard loads, then the existing default workstream behavior from `lib/dashboard/config.ts` remains unchanged for cards, program roll-ups, sprint stories, milestones, and export.
- [x] Given a non-empty scope is saved for a dashboard ID, when the page reloads, then the saved workstream IDs are restored from local storage and reused for Dashboard data fetches and export-facing state.
- [x] Given local storage contains malformed JSON, an invalid payload shape, unavailable storage, stale IDs, or an empty included set, when scope is resolved, then the Dashboard falls back safely to the static default without persisting or rendering an empty scope.
- [x] Given preferences exist for both `main` and `streams`, when each dashboard loads, then dashboard-ID-specific storage keys keep their selected scopes separate with no cross-dashboard bleed.
- [x] Given the workstream list API or modal list load fails, when the user closes, retries, or continues using the Dashboard, then the active saved scope remains unchanged and the failure does not overwrite local storage.
- [x] Given the user attempts to save a modal draft with every workstream excluded, when Save is clicked or submitted, then the UI blocks the save, shows validation, and leaves the active scope unchanged.
- [x] Given a scope change is saved while Dashboard fetches are in flight, when responses settle, then stale responses do not replace newer scoped data and the visible Dashboard/export state reflects the latest active scope.
- [x] Given scoped and unscoped fixture data have different aggregate totals, when metrics are requested with selected workstream IDs, then program aggregates are computed only from scoped workstreams and excluded workstreams do not contribute to cards, roll-ups, milestones, sprint stories, or export.

---

## Implementation Tasks

- [x] **4.1** Add or extend unit tests for the scope storage helper covering unchanged defaults, reload persistence, malformed payload fallback, unavailable storage, stale ID reconciliation, empty saved payload fallback, and dashboard ID key separation.
- [x] **4.2** Add modal/component regression tests for empty-selection validation, recoverable workstream-list error behavior, retry/close flows, and proof that list/API errors do not overwrite the active saved scope.
- [x] **4.3** Add `DashboardContainer` integration tests using the existing mocked fetch lifecycle to cover reload persistence, scoped fetch URLs, separate `main` and `streams` scopes, and scope changes while prior requests are still in flight.
- [x] **4.4** Add API and adapter regression tests proving defaults remain unchanged when `workstreamIds` is absent, stale scoped IDs fall back or filter according to the shared contract, and scoped program aggregates use only selected workstreams.
- [x] **4.5** Add export-facing regression coverage proving exported data is derived from the latest scoped Dashboard state and does not reintroduce excluded workstreams or stale unscoped program totals.
- [x] **4.6** Tighten implementation only where new tests expose gaps in Stories 1-3, keeping behavior aligned with the storage, modal, scoped API, and export contracts rather than adding new product scope.
- [x] **4.7** Verify the focused Jest suites pass for Dashboard components, metrics API, dashboard adapter/scope helpers, and export regressions; document any intentionally deferred edge cases.

---

## Technical Notes

- This story is primarily a regression-hardening story. Prefer focused tests around existing helpers, routes, `DashboardContainer`, and export data flow before changing implementation.
- Preserve the locked contract: browser-local include/exclude scope, non-empty saved selections only, static defaults when no valid preference exists, and no scoped/unscoped drift between Dashboard and export.
- Use the existing Jest and Testing Library stack. Relevant test patterns already exist under `__tests__/components/Dashboard/*`, `__tests__/app/api/metrics/route.test.ts`, `__tests__/lib/dashboard/adapter.test.ts`, and related API/component suites.
- `DashboardContainer` integration tests already mock fetch lifecycle behavior; extend those patterns for in-flight scope changes instead of introducing unrelated test infrastructure.
- Aggregate consistency must be proven with data where excluded workstreams would change totals, not only with request URL assertions.

---

## Context for Agents

- **Parent contract:** `spec.md` -> Contract Summary, especially Deliverable, Hardest Constraint, Business Rules, Success Criteria, and Scope Boundaries.
- **Required behavior:** `spec.md` -> Experience Design -> State Catalog; Business Rules -> Defaults, Scope Semantics, Empty Scope, and Export Consistency.
- **Detailed requirements:** `spec.md` -> Detailed Requirements items 4, 5, 6, and 7; Story Plan item 4 for state coverage and regression tests.
- **Storage and query contract:** `sub-specs/technical-spec.md` -> Scope Storage Contract, API Contract, Scoped Query Parameter, and Validation Rules.
- **Dashboard orchestration:** `sub-specs/technical-spec.md` -> UI Component Plan -> `DashboardContainer` responsibilities.
- **Failure coverage:** `sub-specs/technical-spec.md` -> Error & Rescue Map rows for local storage, load all workstreams, save modal scope, build scoped API query, fetch metrics, aggregate program metrics, and export deck.
- **Edge cases:** `sub-specs/technical-spec.md` -> Shadow Paths and Interaction Edge Cases for empty input, upstream errors, in-flight fetches, deleted workstreams, and main vs Streams dashboards.
- **Testing scope:** `sub-specs/technical-spec.md` -> Testing Requirements for local storage, scoped metrics, component behavior, reload persistence, and aggregate consistency.
- **Relevant code:** `components/Dashboard/DashboardContainer.tsx`, `components/Dashboard/WorkstreamScopeModal.tsx`, `lib/dashboard/workstream-scope.ts`, `lib/dashboard/config.ts`, `app/api/metrics/route.ts`, `app/api/milestones/route.ts`, `lib/dashboard/adapter.ts`, and Dashboard export data flow.

---

## Definition of Done

- [x] Defaults remain unchanged when no valid saved scope exists.
- [x] Reload persistence, malformed/stale storage fallback, dashboard ID separation, and empty-selection prevention are covered by tests.
- [x] Modal list/API errors are recoverable and do not overwrite the active saved scope.
- [x] Dashboard fetch lifecycle tests prove latest active scope wins when requests overlap.
- [x] Scoped program aggregates, milestones, sprint stories, and export-facing data exclude omitted workstreams consistently.
- [x] Focused Jest and Testing Library regression suites pass.
