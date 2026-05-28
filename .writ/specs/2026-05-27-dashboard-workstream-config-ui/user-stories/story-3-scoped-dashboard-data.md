# Story 3: Scoped Dashboard Data

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Stories 1 and 2
> **Spec:** `.writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md`

---

## User Story

**As a** dashboard user with a saved workstream scope,
**I want** metrics, milestones, sprint stories, and export data to all use the same selected workstream IDs,
**So that** every Dashboard surface and exported slide deck excludes omitted workstreams and recomputes program totals from the selected set.

---

## Acceptance Criteria

- [x] Given a saved workstream scope is active, when `GET /api/metrics` is fetched, then the selected `workstreamIds` are validated and applied before aggregation so excluded workstreams do not contribute to workstream cards, program metrics, trends, burndown, roll-ups, or prior-sprint details.
- [x] Given no browser-local preference exists, when Dashboard data loads, then metrics, milestones, sprint stories, and export-facing data keep the existing default behavior from the static dashboard configuration.
- [x] Given selected workstream IDs are sent to milestone data loading, when milestones and program roll-ups are computed, then excluded workstreams do not appear in milestone lists or contribute to program milestone roll-up values.
- [x] Given the scoped metrics response contains only selected workstreams, when sprint story panels load, then `DashboardContainer` fetches story data only for those scoped workstreams and does not request or render stories for excluded workstreams.
- [x] Given Dashboard data has refreshed after a scope save, when export is triggered, then the export input is derived from the current scoped Dashboard state and raw scoped API responses without reintroducing excluded workstreams or stale unscoped program totals.
- [x] Given a scoped API request contains unknown or stale workstream IDs, when at least one valid ID remains, then invalid IDs are handled consistently with the shared scope contract and aggregation still uses only valid scoped workstreams.
- [x] Given an empty selected set would reach a scoped API or fetch builder, when the request is prepared or validated, then the empty scope is prevented or rejected consistently rather than silently producing misleading totals.

---

## Implementation Tasks

- [x] **3.1** Write API regression tests for `GET /api/metrics` proving scoped `workstreamIds` are applied before aggregation, program totals differ when excluded workstreams have values, stale IDs follow the shared validation contract, and absent scope preserves the current dashboard default.
- [x] **3.2** Write milestone route tests covering scoped milestone lists and program roll-ups so excluded workstreams do not contribute when `workstreamIds` are provided, while no preference keeps existing behavior.
- [x] **3.3** Write Dashboard container/component tests covering scoped metrics and milestone fetch URLs, sprint story fetches only for scoped workstreams, refetch after scope save, and export input using the current scoped raw/view-model data.
- [x] **3.4** Extend `app/api/metrics/route.ts` to parse and validate scoped `workstreamIds`, combine them with the dashboard default rules when absent, and filter metric snapshots before building `WorkstreamMetrics` and program aggregates.
- [x] **3.5** Extend `app/api/milestones/route.ts` to accept the same scoped query contract and apply valid workstream IDs before milestone list and program roll-up construction.
- [x] **3.6** Update `components/Dashboard/DashboardContainer.tsx` so the active scope from Stories 1 and 2 is included in metrics and milestone fetches, sprint stories are requested only for scoped workstream IDs returned by metrics, and export receives only current scoped Dashboard data.
- [x] **3.7** Verify the focused API and Dashboard tests pass, then run the relevant metrics, milestone, sprint-story, and export regression tests to confirm default and scoped behavior remain consistent.

---

## Technical Notes

- The central invariant is server-side filtering before aggregation. Do not rely on client-only filtering after program metrics, trends, milestone roll-ups, or export input have already been computed.
- `DashboardContainer` is the orchestration point for applying the active scope to metrics, milestone, sprint-story, and export-facing data flows.
- `GET /api/sprints/stories` remains a single-workstream endpoint for this spec; the Dashboard should avoid fetching it for excluded workstreams rather than adding batching unless implementation needs change.
- Export should use the currently loaded scoped raw metrics response and Dashboard view model. It should not perform a fresh unscoped reconstruction or keep stale pre-save data.
- Empty browser-local preference means default scope, but an explicit empty scoped query is invalid or rejected according to the shared contract established in Story 1.

---

## Context for Agents

- **Parent contract:** `spec.md` -> Contract Summary, especially Deliverable, Hardest Constraint, Business Rules, Success Criteria, and Scope Boundaries.
- **Detailed requirements:** `spec.md` -> Detailed Requirements items 4, 5, 6, and 7; Implementation Approach paragraphs for `DashboardContainer` and scoped API query contracts.
- **Scope semantics:** `spec.md` -> Business Rules -> Defaults, Scope Semantics, and Export Consistency.
- **Data flow invariant:** `sub-specs/technical-spec.md` -> Technical Overview and Proposed Data Flow.
- **API/query contract:** `sub-specs/technical-spec.md` -> API Contract, Scoped Query Parameter, and Validation Rules.
- **Dashboard orchestration:** `sub-specs/technical-spec.md` -> UI Component Plan -> `DashboardContainer`.
- **Failure coverage:** `sub-specs/technical-spec.md` -> Error & Rescue Map rows for Build scoped API query, Fetch metrics, Aggregate program metrics, and Export deck.
- **Shadow paths:** `sub-specs/technical-spec.md` -> Shadow Paths rows for Metrics fetch and Export, plus Scope resolution for nil and empty input behavior.
- **Testing scope:** `sub-specs/technical-spec.md` -> Testing Requirements for scoped metrics, milestone route changes, aggregate consistency, and export input regression.
- **Relevant code:** `components/Dashboard/DashboardContainer.tsx`, `app/api/metrics/route.ts`, `app/api/milestones/route.ts`, `app/api/sprints/stories/route.ts`, `lib/metrics/aggregator.ts`, and the export data flow used by the Dashboard.

---

## Definition of Done

- [x] Metrics API accepts scoped workstream IDs and filters before program aggregation while preserving default behavior when no local preference exists.
- [x] Milestone lists and program roll-ups use the same selected workstream IDs as the metrics payload.
- [x] Sprint story panels are fetched and rendered only for scoped workstreams.
- [x] Export input is derived from current scoped Dashboard state and contains no excluded workstream content or stale unscoped totals.
- [x] Unknown, stale, absent, and empty scoped inputs follow the shared validation and fallback contract.
- [x] Focused API, Dashboard, export, and regression tests pass.
