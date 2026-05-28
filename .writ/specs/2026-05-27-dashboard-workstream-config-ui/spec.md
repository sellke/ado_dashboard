# Dashboard Workstream Config UI

> **Status:** Complete
> **Created:** 2026-05-27
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-05-27-dashboard-workstream-config-ui.md`

## Contract Summary

**Deliverable:** Add a Dashboard workstream scope modal that lets users include/exclude synced workstreams, persists the selection in browser-local storage, and refreshes Dashboard data so cards, program roll-ups, sprint stories, milestones, and export use the same selected scope.

**Must Include:** A clear include/exclude modal launched from the Dashboard with explicit Save/Cancel behavior and defaults that preserve today's visible workstreams when no local preference exists.

**Hardest Constraint:** Browser-local persistence cannot silently affect server-side aggregates unless the selected scope is sent to the APIs. The implementation should avoid client-only filtering after metrics are computed, because that would make program totals wrong.

**Experience Design:**
- **Entry point:** A Dashboard action near existing `Export` / `Sync Now` controls opens the workstream scope modal.
- **Happy path:** User opens modal, toggles workstreams in/out, clicks Save, modal closes, Dashboard refetches with the saved scope.
- **Moment of truth:** Program summary and workstream cards immediately show only the selected workstreams, with no ADO data changed.
- **Feedback model:** Explicit Save applies the new scope; Cancel discards changes; saved scope survives reload in browser-local storage.
- **Error experience:** If the all-workstreams list cannot load, the modal shows a recoverable error and leaves the current Dashboard scope unchanged.

**Business Rules:**
- No database persistence in this spec; scope is per browser/device via local storage.
- Empty local preference means use the existing dashboard default behavior, not "show nothing."
- A user must not be allowed to save an empty included set unless this spec is revised to intentionally support an empty Dashboard state.
- Excluded workstreams must not contribute to program metrics, roll-ups, sprint story panels, or exported slide content.
- Workstreams remain synced from ADO regardless of Dashboard inclusion.

**Success Criteria:** After saving a scope and reloading the page, the Dashboard and export only include selected workstreams, and program-level values are recomputed from that same selected set.

**Scope Boundaries:**
- Included: modal UI, browser-local scope storage, all-workstreams list source, metrics/milestone/story API scope propagation, export consistency.
- Excluded: database schema for saved views, auth/permissions, shared team-wide configuration, metric-threshold editing UI.
- Deferred: named dashboard views can build on this later if browser-local scope is not enough.

**Technical Concerns:**
- `lib/dashboard/config.ts` already has static `main`/`streams` workstream-name scopes. The new work should reuse it as the default fallback or explicitly supersede it; maintaining two independent scope systems would be fragile.
- `GET /api/metrics` currently scopes by configured workstream names. For browser-local selection, IDs are safer than names, but that needs query/API validation.
- Milestones and sprint stories need the same scope propagation, or Dashboard cards and program summary can disagree with milestone panels/export.

**Cross-Spec Overlap:**
- `.writ/issues/features/2026-05-18-report-workstream-scope-config.md` directly overlaps the API/report/export semantics for scoped aggregation.
- `.writ/issues/features/2026-04-09-metric-calculation-config-ui.md` overlaps settings UX, but this contract intentionally avoids the broader metric configuration surface.
- `.writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md` also touches dashboard milestone filtering, so implementation should sequence carefully around milestone route changes.

## Experience Design

### User Journey

The Dashboard remains the user's home base. A new action near the existing export and sync controls opens a modal titled around configuring visible workstreams. The modal lists all synced workstreams by display name, indicates which are currently included, and lets the user toggle membership before saving.

On Save, the modal persists the selected workstream IDs in browser local storage, closes, and triggers a data refresh. The user sees the Dashboard settle into the selected scope: program cards, workstream cards, trend panels, sprint story panels, milestone roll-ups, and export input all line up to the same workstream set.

### State Catalog

- **Default state:** No local preference exists. The Dashboard uses the existing static dashboard default from `lib/dashboard/config.ts`.
- **Loading state:** Dashboard data and all-workstreams metadata can load independently. The modal should show a loading state while the workstream list is unavailable.
- **Populated state:** Modal shows all synced workstreams with included/excluded status and Save/Cancel controls.
- **Validation state:** Save is disabled or blocked when the selected included set is empty.
- **Saved state:** Scope is written to local storage and Dashboard fetches re-run with the selected IDs.
- **Cancelled state:** Unsaved toggles are discarded and the Dashboard remains unchanged.
- **Error state:** Workstream list API failures are shown inside the modal with retry or close affordances; the active saved scope is not overwritten.

### Interaction Patterns

Use existing Mantine patterns already present in the Dashboard: `Button`, `Modal`, `Stack`, `Group`, `Checkbox` or `Switch`, inline `Alert` for recoverable errors, and clear primary/secondary actions. The UI should be keyboard accessible, with focus returning to the triggering button after close.

The Dashboard action should be discoverable but not more prominent than `Sync Now`. A label such as "Configure workstreams" or "Workstream scope" is preferred over an unlabeled icon-only control.

### Responsive Behavior

The modal should work at mobile widths: controls stack vertically, labels wrap, and the workstream list remains scrollable if it grows. The Dashboard grid itself continues to rely on existing responsive behavior after scoped data loads.

## Business Rules

### Persistence

The chosen persistence model is browser-local storage. This means the selection is per browser/device and does not require a Prisma migration, auth model, or saved-view backend.

The local storage payload should store stable workstream IDs, not display names. A versioned key is recommended so future saved-view or deployment-wide persistence can migrate cleanly.

### Defaults

When no local storage entry exists, the Dashboard should behave exactly as it does today. For the current `dashboard="main"` route, that means using the existing configured workstream default. For `dashboard="streams"`, the Streams dashboard default should remain isolated unless the implementation deliberately scopes preferences by dashboard ID.

Preferences should be namespaced by dashboard ID so changing the main Dashboard does not accidentally change the Streams Dashboard.

### Scope Semantics

The selected scope is an include list. Workstreams outside the list remain in the database and continue to sync from ADO; they are only excluded from the current Dashboard/report surface.

Server-side metrics and roll-ups must be computed or queried with the selected workstream IDs before aggregation. Client-only filtering of an already aggregated program result is not acceptable.

### Empty Scope

Users should not be able to save zero included workstreams. This avoids ambiguous "empty dashboard" behavior and prevents accidental local preference states that look like data loss.

### Export Consistency

PowerPoint export uses the currently loaded Dashboard view model and raw scoped API response. Exported slides must not reintroduce excluded workstreams or stale program totals.

## Detailed Requirements

1. Add a Dashboard-level action that opens the workstream scope modal.
2. Provide an API or existing data source that returns all synced workstreams needed to populate the modal.
3. Add a local storage helper for dashboard-scoped included workstream IDs.
4. Ensure Dashboard fetch URLs include the selected scope for metrics, milestones, and sprint stories where applicable.
5. Ensure server API handlers validate scoped workstream IDs and apply them before aggregation and roll-up construction.
6. Preserve current defaults when no saved local preference exists.
7. Add component, adapter/helper, and API tests for defaults, save/cancel behavior, validation, reload persistence, and scoped aggregation.

## Implementation Approach

Reuse the current `DashboardContainer` fetch lifecycle as the orchestration point. It already owns the raw metrics response, milestone fetches, sprint stories fetches, and export input. Add scope state there so all downstream data flows use one source of truth.

Introduce a small client-side scope module, likely under `lib/dashboard/workstream-scope.ts`, for local storage serialization, parsing, validation, key namespacing, and default/fallback behavior. Keep the storage format framework-agnostic so it can be unit tested outside React.

Expose all synced workstreams through a small read-only API route such as `GET /api/workstreams`, or extend an existing endpoint only if that keeps contracts clear. The modal should not infer available workstreams solely from the currently scoped Dashboard payload, because excluded workstreams must remain available to re-add.

Extend relevant API query contracts to accept selected workstream IDs, for example repeated `workstreamId` parameters or a comma-delimited `workstreamIds` parameter. Validate IDs against the database and ignore or reject unknown IDs consistently. Apply the filtered ID set before `aggregateToProgram`, milestone roll-up grouping, and sprint story fetches.

## Story Plan

1. `story-1-scope-contract-and-storage`: Define scope query semantics, local storage helper, and all-workstreams list API. Dependencies: None.
2. `story-2-workstream-scope-modal`: Add Dashboard action and modal with explicit Save/Cancel using browser-local persistence. Dependencies: Story 1.
3. `story-3-scoped-dashboard-data`: Propagate selected scope through metrics, milestones, sprint stories, and export-facing data. Dependencies: Stories 1 and 2.
4. `story-4-state-coverage-and-regression-tests`: Harden defaults, error states, reload persistence, empty-scope validation, and aggregate consistency. Dependencies: Stories 1-3.

## Visual References

No separate visual references were provided. Match existing Dashboard and Mantine patterns.
