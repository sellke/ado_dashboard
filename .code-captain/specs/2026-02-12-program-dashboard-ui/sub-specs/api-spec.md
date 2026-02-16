# Program Dashboard UI - API Specification

> Created: 2026-02-12
> Purpose: Frontend consumption contract for dashboard rendering

## Endpoint Used

### GET /api/metrics

Reads computed metric snapshots for the dashboard.

### POST /api/sync/ado

Triggers a full rolling-window ADO refresh from the dashboard action.

**Dashboard usage contract:**

- Call as a single-action "Sync Now" control.
- No confirmation step before submission.
- Full refresh only (omit body or send `{ "syncType": "Full" }`).
- On completion, immediately refetch `GET /api/metrics`.

**Query Parameters (supported by existing backend):**

| Param | Type | Default | UI Usage |
|---|---|---|---|
| `sprintId` | string | latest snapshot sprint | Optional targeted sprint view |
| `workstreamId` | string | all | Typically omitted for dashboard |
| `includeRolling` | boolean | true | Keep true for context display |
| `includeProgram` | boolean | true | Required for summary section |

## Response Fields Required by UI

- `sprint.id`
- `sprint.name`
- `computedAt`
- `program.metrics.velocity|overheadPercent|predictability|carryOverRate`
- `workstreams[].workstreamId`
- `workstreams[].workstreamName`
- `workstreams[].metrics.*`
- `workstreams[].detail.plannedPoints`
- `workstreams[].detail.completedPoints`
- `workstreams[].detail.carryOverItems`
- `workstreams[].detail.carryOverPoints`

## Null and Empty Handling Contract

- If endpoint returns no snapshots:
  - `sprint: null`
  - `workstreams: []`
  - `program: null`
  - `computedAt: null`
- UI must treat this as an empty state, not an error.

- If metric values are null:
  - UI should render placeholder (`N/A`) and keep card/tile layout stable.

## Error Handling Contract

- `400` for invalid query parameter input
- `500` for unexpected server failure
- UI behavior:
  - Show non-blocking error panel
  - Offer retry action
  - Avoid rendering partial malformed data
  - For sync-trigger failures, preserve current metric view while surfacing sync-specific feedback

## UI Adapter Output (Proposed)

The dashboard adapter should produce:

```ts
type DashboardViewModel = {
  state: "loading" | "success" | "empty" | "error";
  sprintLabel: string | null;
  computedAtLabel: string | null;
  programMetrics: MetricTileViewModel[] | null;
  workstreamCards: WorkstreamCardViewModel[];
  errorMessage?: string;
};
```

This adapter output decouples presentational components from backend response shape changes.
