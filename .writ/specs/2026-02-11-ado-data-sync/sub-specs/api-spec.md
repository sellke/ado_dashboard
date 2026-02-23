# API Specification — ADO Data Sync

> **Developer reference:** See [docs/API.md](../../../docs/API.md) for API contract and SyncLog schema.

## Endpoint

- `POST /api/sync/ado`

## Story 1 Implementation (Current)

**Request body (optional):**
```json
{ "syncType": "Full" | "WorkItems" | "Iterations" | "Capacity" }
```
Defaults to `Full` if omitted.

**Response (200):**
```json
{
  "success": true,
  "syncLogId": "clx...",
  "summary": {
    "status": "Success",
    "workstreams": [
      {
        "workstreamId": "clx...",
        "status": "Success",
        "itemsFetched": 10,
        "itemsCreated": 5,
        "itemsUpdated": 3
      }
    ],
    "totals": {
      "itemsFetched": 20,
      "itemsCreated": 10,
      "itemsUpdated": 6
    }
  }
}
```
On partial failure: `summary.status` is `"Failed"`, each workstream has `status` and optional `error`.

## Purpose

Manually trigger ADO data sync for rolling 5 sprints (current + 4 prior) across all 4 Yellow Box workstreams.

## Consumer Notes

- Primary consumer remains operator/manual invocation.
- Dashboard UI may invoke this endpoint via a single "Sync Now" action (tracked in `2026-02-12-program-dashboard-ui`, Story 5).

## Authentication/Authorization (MVP)

- Local operator invocation only.
- No external/public exposure requirement in MVP.

## Request

### Body (optional)

```json
{
  "lookbackSprints": 5,
  "includeCurrentSprint": true,
  "dryRun": false,
  "forceCapacityOverride": false
}
```

Notes:
- Default `lookbackSprints` = 5.
- `includeCurrentSprint` should remain `true` for contract compliance.
- `dryRun` is optional for validation/debug.
- `forceCapacityOverride` should default to `false` to preserve manual lock behavior.

## Response

### Success (200)

```json
{
  "runId": "cuid",
  "status": "Success",
  "startedAt": "2026-02-11T20:10:00.000Z",
  "completedAt": "2026-02-11T20:10:42.000Z",
  "window": {
    "sprintsIncluded": 5,
    "currentSprintPath": "Event Streaming Platform\\FY26\\Q4\\Sprint 26.21"
  },
  "totals": {
    "itemsFetched": 0,
    "itemsCreated": 0,
    "itemsUpdated": 0
  },
  "workstreams": [
    {
      "name": "Streams",
      "status": "Success",
      "iterationsSynced": 5,
      "workItemsFetched": 0,
      "workItemsCreated": 0,
      "workItemsUpdated": 0,
      "capacitySynced": true,
      "retries": 0,
      "errors": []
    }
  ],
  "warnings": [
    "Current sprint is included for projection only and must be excluded from rolling averages."
  ]
}
```

### Partial success (207 or 200 with status flag)

```json
{
  "runId": "cuid",
  "status": "PartialSuccess",
  "workstreams": [
    { "name": "Streams", "status": "Success", "errors": [] },
    { "name": "Pitch Tracker", "status": "Failed", "errors": ["timeout after retries"] }
  ]
}
```

### Failure (500)

```json
{
  "runId": "cuid",
  "status": "Failed",
  "message": "Sync failed before any workstream completed.",
  "errors": ["top-level connection failure"]
}
```

## Error handling requirements

- Isolate failures per workstream.
- Retry transient failures with bounded attempts.
- Persist failure details to `SyncLog`.
- Return actionable summary without leaking secrets.

## Contract safeguards

- The response must clearly identify the current sprint.
- The system must preserve data needed so downstream metrics can exclude current sprint from rolling averages.
