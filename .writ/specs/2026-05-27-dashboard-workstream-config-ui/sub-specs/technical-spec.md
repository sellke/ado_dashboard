# Technical Spec — Dashboard Workstream Config UI

> **Parent Spec:** `.writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md`
> **Created:** 2026-05-27

## Technical Overview

This feature turns the current static dashboard workstream scope into a browser-local, user-editable preference while preserving server-side aggregate correctness.

The important invariant is:

> Every surface that displays scoped Dashboard data must use the same selected workstream IDs, and server APIs must filter before computing program totals or roll-ups.

## Current Architecture

- `lib/dashboard/config.ts` defines static dashboard scopes by workstream name for `main` and `streams`.
- `DashboardContainer` owns metrics, milestone, sprint-story, sync, and export data lifecycles.
- `GET /api/metrics` resolves the static dashboard config and filters metric snapshots before building workstream payloads and program aggregates.
- Sprint story and milestone APIs are separate fetches, so they need explicit scope propagation to avoid disagreement with the metrics payload.

## Proposed Data Flow

```text
Dashboard route (`dashboard` id)
  -> DashboardContainer loads saved scope from local storage
  -> GET /api/workstreams lists all synced workstreams for modal options
  -> Dashboard fetches scoped APIs with selected workstream IDs
  -> APIs validate IDs and apply filters before aggregation/roll-up
  -> Dashboard view model and export input use scoped responses
```

## Scope Storage Contract

Use a versioned, dashboard-specific local storage key:

```text
dashboardWorkstreamScope:v1:{dashboardId}
```

Recommended payload:

```json
{
  "includedWorkstreamIds": ["workstream-id-1", "workstream-id-2"],
  "updatedAt": "2026-05-27T00:00:00.000Z"
}
```

Rules:

- Stored IDs are workstream IDs, not workstream names.
- Unknown or stale IDs are ignored once the current all-workstreams list is known.
- If no valid stored IDs remain, fall back to the static dashboard default rather than showing an empty Dashboard.
- Do not save an empty `includedWorkstreamIds` list from the modal.

## API Contract

### `GET /api/workstreams`

Returns all synced workstreams needed to populate the modal.

Suggested response:

```json
{
  "workstreams": [
    { "id": "cuid", "name": "Action Tracker", "adoAreaPath": "..." }
  ]
}
```

Sort by display name. This endpoint is read-only and should not apply the current Dashboard scope.

### Scoped Query Parameter

Use one canonical query shape across endpoints:

```text
workstreamIds=id1,id2,id3
```

Endpoints:

- `GET /api/metrics?dashboard=main&workstreamIds=...`
- `GET /api/milestones?workstreamIds=...`
- `GET /api/sprints/stories?workstreamId=...` remains single-workstream today; `DashboardContainer` should call it only for scoped workstreams.

If a route later needs multiple story requests in one call, add `workstreamIds` there too, but this spec does not require that batching.

### Validation Rules

- If `workstreamIds` is absent, use existing dashboard defaults where applicable.
- If `workstreamIds` is present but empty, return `400` or ignore it consistently. The UI should prevent this state.
- Unknown IDs should be ignored or rejected consistently. Prefer ignoring unknown IDs if at least one valid ID remains; return an empty scoped result only when the caller explicitly requested IDs and none are valid.
- Apply valid IDs before aggregation, roll-up, trends, burndown, and prior-sprint detail queries.

## UI Component Plan

### `WorkstreamScopeModal`

Props:

- `opened: boolean`
- `workstreams: Array<{ id: string; name: string; adoAreaPath?: string | null }>`
- `selectedIds: string[]`
- `loading: boolean`
- `error: string | null`
- `onSave(ids: string[]): void`
- `onCancel(): void`
- `onRetry?(): void`

Behavior:

- Maintains a draft selection while open.
- Save validates at least one selected ID.
- Cancel restores the previous active selection.
- Shows excluded/included status clearly through checkboxes or switches.

### `DashboardContainer`

Responsibilities:

- Load saved browser-local scope after mount.
- Load all workstreams for modal options.
- Resolve the active scope: saved valid IDs if present, otherwise dashboard default IDs derived from `lib/dashboard/config.ts`.
- Include active scoped IDs in metrics and milestone fetch URLs.
- Fetch sprint stories only for scoped workstream IDs returned by metrics.
- Refetch metrics/milestones/stories after Save.
- Keep export input derived from current scoped responses.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Load local storage | Malformed JSON, unavailable storage | Ignore invalid payload; fall back to static default | Unit test parser with invalid JSON and storage exceptions |
| Load all workstreams | API/network failure | Modal shows error; active Dashboard scope unchanged | Component test mocked failed fetch |
| Save modal scope | User selects zero workstreams | Block Save with validation message | Component test empty selection |
| Build scoped API query | Stored IDs include stale/deleted ID | Drop stale IDs after list/API validation | Unit/API test with stale ID |
| Fetch metrics | API returns error | Existing Dashboard error path; saved scope remains | Integration/component test with failed metrics fetch |
| Aggregate program metrics | Filtering happens after aggregation | Prohibited; filter snapshots before `aggregateToProgram` | API test comparing scoped program total |
| Export deck | Export uses stale unscoped raw data | Export reads current scoped `rawMetrics` and view model | Component/export input test |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Scope resolution | Saved IDs are valid and active | No local storage -> static dashboard default | Empty draft -> Save blocked | localStorage unreadable -> default scope |
| Workstream list modal | All synced workstreams listed | No synced workstreams -> disabled/empty modal state | User deselects all -> validation | `/api/workstreams` error shown in modal |
| Metrics fetch | APIs receive selected IDs and aggregate over them | No selected preference -> existing default | Empty query rejected/prevented | Metrics API error uses existing Dashboard error |
| Export | Deck contains scoped cards and program values | No preference -> default deck | Empty scope impossible | Export failure uses existing export error |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| User clicks Save twice | Disable Save during apply/refetch or make handler idempotent |
| User closes modal with unsaved draft | Treat as Cancel; active scope unchanged |
| Scope changes while prior fetch is in flight | Use latest active scope when setting state, or refetch after Save so newest saved scope wins |
| Workstream renamed in ADO | Stored IDs remain valid; modal shows new name |
| Workstream deleted from DB | Drop stale stored ID; if no valid IDs remain, fall back to default |
| Main vs Streams dashboards | Local storage keys include dashboard ID |

## Testing Requirements

- Unit tests for local storage serialization, parse fallback, dashboard key generation, stale ID reconciliation, and query building.
- API tests for `GET /api/workstreams` and scoped `GET /api/metrics`.
- Existing `app/api/milestones/route.ts` tests should gain scoped filter cases if the route is changed.
- Component tests for modal open/close, Save, Cancel, empty selection, workstream-list error, and reload persistence.
- Regression test that scoped program aggregate differs from unscoped aggregate when excluded workstreams have metric values.

## Out of Scope

- Prisma schema changes for saved dashboard views.
- User accounts, permissions, or shared team settings.
- Metric calculation rule editing.
- A separate settings route.
- Sync filtering; ADO sync remains unchanged.
