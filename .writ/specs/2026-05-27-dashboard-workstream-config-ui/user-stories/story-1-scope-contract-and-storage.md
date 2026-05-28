# Story 1: Scope Contract and Storage

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None
> **Spec:** `.writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md`

---

## User Story

**As a** developer implementing scoped Dashboard data,
**I want** a shared contract for browser-local scope storage, scoped API query parameters, and all-workstream option loading,
**So that** later Dashboard UI, aggregation, sprint story, milestone, and export work all use stable workstream IDs before server-side totals are computed.

---

## Acceptance Criteria

- [x] Given no local storage preference exists for a dashboard ID, when scope is resolved, then the Dashboard falls back to the static default from `lib/dashboard/config.ts` and preserves the workstreams visible today.
- [x] Given local storage contains malformed JSON, an invalid payload shape, unavailable storage, or an empty included set, when scope is loaded, then the helper ignores the saved value and returns the dashboard default rather than showing an empty Dashboard.
- [x] Given local storage contains stale workstream IDs, when the current all-workstreams list is available, then stale IDs are dropped and valid IDs remain active; if no valid IDs remain, the dashboard default is used.
- [x] Given preferences are saved for different dashboard IDs, when each dashboard loads, then local storage keys are namespaced by dashboard ID using `dashboardWorkstreamScope:v1:{dashboardId}` and selections do not bleed across dashboards.
- [x] Given a selected scope is serialized or sent to an API, when the helper builds the payload/query, then it uses workstream IDs, not workstream names, and does not allow saving an empty selection.
- [x] Given `GET /api/workstreams` is called, when synced workstreams exist, then it returns all synced workstreams sorted by display name with `id`, `name`, and `adoAreaPath` without applying the current Dashboard scope.
- [x] Given `workstreamIds=id1,id2` is present on a scoped API query, when validation runs, then valid IDs are available for server-side filtering before aggregates, roll-ups, trends, and prior-sprint details are computed.

---

## Implementation Tasks

- [x] **1.1** Write unit tests for dashboard scope storage defaults, malformed payload fallback, storage exceptions, dashboard ID namespacing, empty-selection rejection, and stale ID reconciliation.
- [x] **1.2** Write unit tests for scoped query parsing/building semantics, including absent `workstreamIds`, comma-delimited IDs, empty query handling, and unknown/stale IDs.
- [x] **1.3** Add a framework-agnostic dashboard scope helper, likely `lib/dashboard/workstream-scope.ts`, for key generation, serialization, parsing, validation, fallback resolution, and query construction.
- [x] **1.4** Add API tests for `GET /api/workstreams` covering all synced workstreams, response shape, display-name sorting, and no current-dashboard filtering.
- [x] **1.5** Implement the read-only `GET /api/workstreams` route using `Workstream.id`, `Workstream.name`, and `Workstream.adoAreaPath` from Prisma.
- [x] **1.6** Define or expose reusable scoped query validation for later `GET /api/metrics`, milestone, and story integration, keeping `lib/dashboard/config.ts` as the default fallback.
- [x] **1.7** Verify the new unit/API tests pass and document any route/query behavior that later stories must consume.

---

## Technical Notes

- Scope persistence is browser-local `localStorage`; do not add Prisma schema, auth, saved-view, or shared team-setting persistence in this story.
- The stored selection is an include list of workstream IDs. Names from `lib/dashboard/config.ts` are only for default fallback resolution.
- Empty saved selections are invalid. Empty or absent local preference means "use default scope," not "show no workstreams."
- Unknown scoped IDs should be handled consistently with the technical spec: prefer ignoring unknown IDs when at least one valid ID remains.
- This story establishes contract and helpers; modal UI and full Dashboard data propagation are handled by later stories.

---

## Context for Agents

- **Contract summary:** `spec.md` -> Contract Summary, especially Deliverable, Must Include, Hardest Constraint, and Business Rules.
- **Defaults and persistence:** `spec.md` -> Experience Design -> State Catalog; Business Rules -> Persistence, Defaults, Scope Semantics, Empty Scope.
- **Detailed requirements:** `spec.md` -> Detailed Requirements items 2, 3, 5, and 6; Implementation Approach paragraphs for `lib/dashboard/workstream-scope.ts`, `GET /api/workstreams`, and scoped query contracts.
- **Storage contract:** `sub-specs/technical-spec.md` -> Scope Storage Contract.
- **API/query contract:** `sub-specs/technical-spec.md` -> API Contract, Scoped Query Parameter, and Validation Rules.
- **Failure coverage:** `sub-specs/technical-spec.md` -> Error & Rescue Map rows for local storage, stale IDs, and aggregate filtering; Shadow Paths -> Scope resolution and Workstream list modal.
- **Testing scope:** `sub-specs/technical-spec.md` -> Testing Requirements for storage, query building, and `GET /api/workstreams`.
- **Relevant code:** `lib/dashboard/config.ts`, `app/api/metrics/route.ts`, and `prisma/schema.prisma` (`Workstream` model).

---

## Definition of Done

- [x] Local storage helper is tested for defaults, malformed payloads, stale IDs, dashboard ID namespacing, and empty-selection rejection.
- [x] Scoped query semantics are covered by tests and ready for server-side aggregate filtering in later stories.
- [x] `GET /api/workstreams` returns all synced workstreams by ID, name, and ADO area path without applying Dashboard scope.
- [x] Static dashboard config remains the fallback when no valid browser-local selection exists.
- [x] Verification tests pass for the new helper and API route.
