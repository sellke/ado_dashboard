# API Reference

## ADO Sync API

### POST /api/sync/ado

Manually trigger ADO data sync for rolling 5 sprints (current + 4 prior) across all workstreams. **Iteration sync** (Story 2), **work item sync** (Story 3), and **capacity sync** (Story 4) are implemented. The sync orchestrator runs each phase based on `syncType` (see table below).

**Dashboard UI integration (Story 5):** The dashboard "Sync Now" button calls this endpoint with `syncType: "Full"` on click. The UI shows in-flight feedback (disabled button, "Syncing…"), auto-refetches metrics on success, and surfaces non-blocking error or partial-success alerts when sync fails or metrics refetch fails. See [Dashboard Shell](features/dashboard-shell).

**Request**

| Method | Path |
|--------|------|
| POST   | `/api/sync/ado` |

**Headers**

- `Content-Type: application/json` (optional; used only when sending body)

**Body (optional)**

```json
{
  "syncType": "Full" | "WorkItems" | "Iterations" | "Capacity"
}
```

| Field    | Type   | Default | Description                                       |
|----------|--------|---------|---------------------------------------------------|
| syncType | string | `"Full"` | Scope of sync: `Full`, `WorkItems`, `Iterations`, or `Capacity` |

If body is omitted or invalid, `syncType` defaults to `Full`.

**syncType behavior:**

| Value | Iteration sync | Work item sync | Capacity sync |
|-------|----------------|----------------|---------------|
| `Full` | Yes | Yes | Yes |
| `Iterations` | Yes | No | No |
| `WorkItems` | No | Yes | No |
| `Capacity` | Yes (needed for iteration IDs) | No | Yes |

**Response (200)**

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
        "itemsUpdated": 3,
        "capacitySummary": {
          "sprintsUpserted": 5,
          "sprintsSkippedLocked": 0,
          "retries": 0
        }
      }
    ],
    "totals": {
      "itemsFetched": 20,
      "itemsCreated": 10,
      "itemsUpdated": 6
    },
    "currentSprintId": "clx...",
    "currentSprintPath": "Project\\Iteration\\Sprint 1 Q4 FY26",
    "sprintsSynced": 5
  }
}
```

On partial failure (one or more workstreams failed), `summary.status` is `"Failed"`, `success` is `false`, and failed workstreams include an `error` field:

```json
{
  "success": false,
  "syncLogId": "clx...",
  "summary": {
    "status": "Failed",
    "workstreams": [
      {
        "workstreamId": "clx...",
        "status": "Success",
        "itemsFetched": 10,
        "itemsCreated": 5,
        "itemsUpdated": 3,
        "capacitySummary": {
          "sprintsUpserted": 5,
          "sprintsSkippedLocked": 0,
          "retries": 0
        }
      },
      {
        "workstreamId": "clx...",
        "status": "Failed",
        "itemsFetched": 0,
        "itemsCreated": 0,
        "itemsUpdated": 0,
        "error": "Simulated workstream failure"
      }
    ],
    "totals": { "itemsFetched": 10, "itemsCreated": 5, "itemsUpdated": 3 }
  }
}
```

**Response (500)**

Top-level error when sync cannot start or orchestrator throws:

```json
{
  "success": false,
  "error": "Error message"
}
```

**Iteration sync metadata** (when `syncType` is `Full` or `Iterations`)

| Field | Type | Description |
|-------|------|-------------|
| `summary.currentSprintId` | string \| null | Local Sprint ID for the current sprint (ADO-determined) |
| `summary.currentSprintPath` | string \| null | ADO iteration path of the current sprint |
| `summary.sprintsSynced` | number | Count of sprints upserted in iteration sync |

**Per-workstream isolation**

Failures in one workstream do not abort others. Each workstream sync runs in its own try/catch; results are aggregated and returned in `summary.workstreams`.

---

## Metrics API (Story 3)

Metrics are computed after sync, persisted to `MetricSnapshot`, and exposed via these routes.

### GET /api/metrics

Fetch computed metrics for a sprint.

**Query parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| sprintId | string | latest | Sprint ID; defaults to most recent sprint with snapshots |
| workstreamId | string | all | Filter to specific workstream |
| includeRolling | boolean | true | Include rolling average (avg) in metric objects |
| includeProgram | boolean | true | Include program-level aggregate |

**Response (200)**

```json
{
  "sprint": {
    "id": "clx...",
    "name": "Sprint 26.20",
    "startDate": "2026-01-20T00:00:00Z",
    "endDate": "2026-02-02T00:00:00Z"
  },
  "workstreams": [
    {
      "workstreamId": "clx...",
      "workstreamName": "Streams",
      "metrics": {
        "velocity": { "value": 34, "avg": 31.5, "rag": "Green" },
        "overheadPercent": { "value": 28.5, "avg": 26.2, "rag": "Green" },
        "predictability": { "value": 85.0, "avg": 82.0, "rag": "Green" },
        "carryOverRate": { "value": 8.5, "avg": 11.0, "rag": "Green" }
      },
      "detail": {
        "plannedPoints": 40,
        "completedPoints": 34,
        "carryOverItems": 3,
        "carryOverPoints": 6,
        "overheadHours": 22.8,
        "grossHours": 80.0
      },
      "trends": {
        "sprints": [
          {
            "sprintId": "clx...",
            "sprintName": "Sprint 26.19",
            "velocity": 32,
            "velocityRate": 0.85,
            "activeBugs": 2,
            "bugsClosed": 1,
            "mode": "actual",
            "bugs": [
              { "adoId": 12001, "title": "Login timeout on slow networks", "state": "Closed" },
              { "adoId": 12045, "title": "Export button misaligned on mobile", "state": "Active" }
            ]
          }
        ]
      },
      "prediction": {
        "velocity": 14.2,
        "velocityRate": 0.88,
        "mode": "predicted",
        "formula": "average velocity rate × current sprint net capacity hours"
      }
    }
  ],
  "program": {
    "metrics": {
      "velocity": { "value": 128, "avg": 120.5, "rag": "Green" },
      "overheadPercent": { "value": 31.2, "avg": 29.0, "rag": "Amber" },
      "predictability": { "value": 82.0, "avg": 80.5, "rag": "Green" },
      "carryOverRate": { "value": 12.0, "avg": 13.5, "rag": "Amber" }
    }
  },
  "computedAt": "2026-02-11T18:30:00Z"
}
```

**Per-workstream extended fields (Story 1 — API Data Contract Extension)**

| Field | Location | Type | Description |
|-------|----------|------|-------------|
| `prediction` | Per workstream | `{ velocity, velocityRate, mode, formula }` | Predicted velocity for current sprint; `velocity`/`velocityRate` may be null when no completed sprints have valid rates |
| `bugs` | Per trend sprint in `trends.sprints` | `Array<{ adoId, title, state }>` | Bug work items for the sprint, sorted by `adoId` ascending; empty array when no bugs |

**Response (200 — no data)**

```json
{
  "sprint": null,
  "workstreams": [],
  "program": null,
  "computedAt": null
}
```

**Error responses**

- 500: Server error

### POST /api/metrics/compute

Manually trigger metric computation for a sprint.

**Request**

| Method | Path |
|--------|------|
| POST | `/api/metrics/compute` |

**Headers**

- `Content-Type: application/json` (optional; used when sending body)

**Body (optional)**

```json
{
  "sprintId": "clx..."
}
```

`sprintId` is optional — defaults to most recent sprint by `endDate`.

**Response (200)**

```json
{
  "success": true,
  "snapshotsCreated": 4,
  "sprintId": "clx...",
  "sprintName": "Sprint 26.21"
}
```

**Error responses**

- 400: Invalid sprintId (empty or non-string)
- 404: Sprint not found
- 500: Computation error

**Default sprint resolution**

- **GET /api/metrics:** Most recent sprint with at least 1 MetricSnapshot.
- **POST /api/metrics/compute:** Most recent sprint by `endDate`.

**Post-sync auto-compute**

After a successful sync, the orchestrator calls `computeAllMetrics(currentSprintId)`. Metric computation errors are logged but do not fail the sync.

---

## Milestones API (Story 1)

CRUD endpoints for feature-level monthly milestones per workstream. Supports manual entry and programmatic management.

### GET /api/milestones

Fetch milestones with workstream relation, ordered by targetMonth.

**Query parameters**

| Param | Type | Description |
|-------|------|-------------|
| workstreamId | string | Optional. Filter to milestones for this workstream |

**Response (200)**

```json
[
  {
    "id": "clx...",
    "title": "Feature XYZ",
    "workstreamId": "clx...",
    "targetMonth": "2026-03-01T00:00:00.000Z",
    "status": "NotStarted",
    "adoFeatureId": null,
    "notes": null,
    "createdAt": "2026-02-12T12:00:00.000Z",
    "updatedAt": "2026-02-12T12:00:00.000Z",
    "workstream": { "id": "clx...", "name": "Streams" }
  }
]
```

**Error responses**

- 500: Server error

### POST /api/milestones

Create a milestone. `status` defaults to `NotStarted` when omitted.

**Request**

| Method | Path |
|--------|------|
| POST | `/api/milestones` |

**Headers**

- `Content-Type: application/json`

**Body**

```json
{
  "title": "Feature XYZ",
  "workstreamId": "clx...",
  "targetMonth": "2026-03-01",
  "status": "NotStarted",
  "adoFeatureId": 12345,
  "notes": "Optional notes"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|--------|-------------|
| title | string | Yes | — | Non-empty trimmed string |
| workstreamId | string | Yes | — | Must reference existing workstream |
| targetMonth | string | Yes | — | Valid ISO date string |
| status | string | No | `NotStarted` | One of: `NotStarted`, `InProgress`, `Done` |
| adoFeatureId | number | No | null | Optional positive integer (ADO feature ID) |
| notes | string | No | null | Optional string |

**Response (201)**

Returns the created milestone with `workstream` relation included (same shape as GET).

**Error responses**

- 400: Invalid JSON body, or validation failed (`error`, `errors` array with descriptive messages; e.g. missing required fields, invalid workstreamId, invalid status)
- 500: Server error

### PATCH /api/milestones/[id]

Update a milestone. Only provided fields are validated and updated.

**Request**

| Method | Path |
|--------|------|
| PATCH | `/api/milestones/[id]` |

**Body**

All fields optional. Same validation rules as POST when provided.

```json
{
  "title": "Updated title",
  "status": "InProgress",
  "notes": "Updated notes"
}
```

**Response (200)**

Returns the updated milestone with `workstream` relation.

**Error responses**

- 400: Invalid JSON body, or validation failed
- 404: Milestone not found
- 500: Server error

### DELETE /api/milestones/[id]

Delete a milestone.

**Request**

| Method | Path |
|--------|------|
| DELETE | `/api/milestones/[id]` |

**Response (204)**

No body.

**Error responses**

- 404: Milestone not found
- 500: Server error

**Validation helper** (`lib/milestones/validation.ts`): `validateCreate` and `validateUpdate` for request body validation; `workstreamId` existence is checked by the API routes.

---

## Iteration Sync (Story 2)

For `syncType: "Full"` or `"Iterations"`, the orchestrator:

1. Fetches team iterations from ADO (`ADO_PAT`, `ADO_ORG` env vars; project/team from `lib/sync/config.ts`)
2. Selects a rolling 5-sprint window: current sprint + 4 most recent prior sprints (future sprints excluded)
3. Upserts local `Sprint` records by ADO iteration path (canonical key)
4. Returns `currentSprintId`, `currentSprintPath`, and `sprintsSynced` in the response summary

Configuration: `lib/sync/config.ts` (`SYNC_CONFIG.projectNameOrId`, `iterationTeamId`, `lookbackSprintCount`).

---

## Capacity Sync (Story 4)

For `syncType: "Full"` or `"Capacity"`, the orchestrator runs capacity sync *after* iteration sync (iterations are required to resolve Sprint IDs). Capacity sync:

1. **Fetches team capacity** from ADO REST API per team per iteration (`lib/sync/ado-client.ts` → `fetchTeamCapacity`)
2. **Aggregates** member capacity into `SprintWorkstream` fields:
   - `grossHours` — total hours across all team members
   - `ptoHours` — hours marked as PTO/absence
   - `ceremonyHours` — hours in ceremony activities
   - `fteCount` — effective headcount
3. **Respects `capacityLocked`** — if a SprintWorkstream has `capacityLocked: true`, capacity is not overwritten; the sprint is counted in `sprintsSkippedLocked`

**Retry logic** (`fetchTeamCapacity`): Exponential backoff with max 3 retries for 5xx and 429 responses.

**Per-workstream isolation**: Each workstream's capacity sync runs in its own try/catch. A failure in one workstream does not block others; errors are recorded in `perWorkstreamSummary` and the sync continues.

**Implementation**: `lib/sync/capacity.ts` orchestrates the fetch and upsert; `lib/sync/ado-client.ts` provides the ADO client with retry logic.

---

## SyncLog schema

The sync endpoint creates and updates a `SyncLog` record for each run. Schema (Prisma):

| Field               | Type      | Description                                              |
|---------------------|-----------|----------------------------------------------------------|
| id                  | string    | CUID                                                     |
| syncType            | SyncType  | `Full`, `WorkItems`, `Iterations`, or `Capacity`         |
| status              | SyncStatus| `Running` → `Success` or `Failed`                        |
| itemsFetched        | int?      | Total items fetched (all workstreams)                    |
| itemsCreated        | int?      | Total items created                                      |
| itemsUpdated        | int?      | Total items updated                                      |
| errorMessage        | string?   | Aggregated error messages when status is `Failed`       |
| perWorkstreamSummary| Json?     | Per-workstream execution summary (see below)             |
| startedAt           | DateTime  | Set when record is created                               |
| completedAt         | DateTime? | Set when sync finishes                                   |
| createdAt           | DateTime  | Record creation timestamp                                |

**perWorkstreamSummary** (JSONB)

Array of per-workstream execution summaries persisted on completion. When capacity sync runs, each entry may include `capacitySummary` (see [Capacity Sync](#capacity-sync-story-4)):

```json
[
  {
    "workstreamId": "clx...",
    "status": "Success",
    "itemsFetched": 10,
    "itemsCreated": 5,
    "itemsUpdated": 3,
    "capacitySummary": {
      "sprintsUpserted": 5,
      "sprintsSkippedLocked": 0,
      "retries": 0
    }
  },
  {
    "workstreamId": "clx...",
    "status": "Failed",
    "itemsFetched": 0,
    "itemsCreated": 0,
    "itemsUpdated": 0,
    "error": "timeout after retries"
  }
]
```

**Lifecycle**

1. Create `SyncLog` with `status: Running` at start.
2. Process each workstream with per-workstream isolation.
3. Update `SyncLog` with `status: Success` or `Failed`, counts, `errorMessage`, `perWorkstreamSummary`, and `completedAt`.

---

## MetricSnapshot schema (Story 1)

The `MetricSnapshot` model stores per-workstream per-sprint computed metrics. It is populated by the metric computation orchestrator (calculator functions → rolling averages → RAG enrichment → upsert).

**Prisma model** (`prisma/schema.prisma`)

| Field | Type | Description |
|-------|------|-------------|
| id | string | CUID |
| sprintId | string | FK to Sprint |
| workstreamId | string | FK to Workstream |
| velocity | Float? | Completed points (velocity) |
| overheadPercent | Float? | Overhead hours as % of gross |
| predictability | Float? | completedPoints / plannedPoints |
| carryOverRate | Float? | carryOverPoints / plannedPoints |
| carryOverItems | Int? | Number of items carried over |
| carryOverPoints | Float? | Story points carried over |
| plannedPoints | Float? | Planning audit |
| completedPoints | Float? | Planning audit |
| overheadHours | Float? | Planning audit |
| grossHours | Float? | Planning audit |
| velocityAvg | Float? | 4-sprint rolling average |
| overheadPercentAvg | Float? | 4-sprint rolling average |
| predictabilityAvg | Float? | 4-sprint rolling average |
| carryOverRateAvg | Float? | 4-sprint rolling average |
| velocityRag | String? | RAG color: 'Green' \| 'Amber' \| 'Red' |
| overheadRag | String? | RAG color |
| predictabilityRag | String? | RAG color |
| carryOverRag | String? | RAG color |
| computedAt | DateTime | When metrics were computed |
| createdAt | DateTime | Record creation |
| updatedAt | DateTime | Last update |

**Constraints**

- `@@unique([sprintId, workstreamId])` — one snapshot per sprint per workstream; use upsert for idempotent writes.
- `@@index([sprintId])` — for queries by sprint.

**Relations**

- `Sprint` — `onDelete: Cascade` (deleting a sprint removes its snapshots).
- `Workstream` — `onDelete: Cascade` (deleting a workstream removes its snapshots).

**TypeScript types** (`lib/metrics/types.ts`)

| Interface | Purpose |
|-----------|---------|
| `RagColor` | `'Green' \| 'Amber' \| 'Red' \| null` |
| `MetricValues` | Raw calculator output before enrichment |
| `MetricWithRag` | Single metric with value, average, rag |
| `WorkstreamMetrics` | Per-workstream bundle (maps to MetricSnapshot) |
| `ProgramMetrics` | Program-level weighted aggregates |
| `RollingAverages` | 4-sprint rolling average window |
| `PredictabilityResult` | Predictability calculator result |
| `CarryOverResult` | Carry-over calculator result |
| `ComputeMetricsResult` | Orchestrator result (workstreams + program + errors) |

**Usage for downstream stories**

- **Calculator functions**: Accept `SprintWorkstream` / `WorkItem` data; return `MetricValues`, `PredictabilityResult`, or `CarryOverResult`.
- **Orchestrator**: Fetches prior snapshots for rolling averages; applies RAG via `ThresholdConfig`; upserts `MetricSnapshot` per workstream.
- **API routes**: Query `MetricSnapshot` by `sprintId` or `workstreamId`; return `WorkstreamMetrics` / `ProgramMetrics` shapes.
