# Metric Engine — API Specification

> Created: 2026-02-11

## Endpoints

### GET /api/metrics

Read computed metric snapshots for dashboard display.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| sprintId | string | latest | Sprint ID; defaults to most recent sprint with snapshots |
| workstreamId | string | all | Filter to specific workstream |
| includeRolling | boolean | true | Include rolling average fields |
| includeProgram | boolean | true | Include program-level aggregate |

**Response (200):**
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

**Response (200 — no data):**
```json
{
  "sprint": null,
  "workstreams": [],
  "program": null,
  "computedAt": null
}
```

**Error responses:**
- 400: Invalid query parameters
- 500: Server error

### POST /api/metrics/compute

Manually trigger metric computation.

**Request body:**
```json
{
  "sprintId": "clx..."
}
```
`sprintId` is optional — defaults to current sprint (most recent by endDate).

**Response (200):**
```json
{
  "success": true,
  "snapshotsCreated": 4,
  "sprintId": "clx...",
  "sprintName": "Sprint 26.21"
}
```

**Error responses:**
- 400: Invalid sprintId
- 404: Sprint not found
- 500: Computation error (partial results may exist)

## Default Sprint Resolution

When `sprintId` is not provided:
- **GET /api/metrics:** Find the most recent sprint that has at least 1 MetricSnapshot. This avoids returning an empty current sprint.
- **POST /api/metrics/compute:** Find the most recent sprint by `endDate`. This allows computing metrics for the current sprint.

## Program Aggregate Computation

Program metrics are NOT stored in the database. They are computed on-the-fly from per-workstream MetricSnapshot records:

1. Fetch all MetricSnapshot records for the given sprintId
2. For each metric, compute weighted average: `SUM(metric * plannedPoints) / SUM(plannedPoints)`
3. For velocity: simple SUM across workstreams (not weighted average)
4. For RAG: apply same logic to the aggregated values

## Response Formatting

MetricSnapshot DB fields are transformed into the nested response shape:

```typescript
// DB: { velocity: 34, velocityAvg: 31.5, velocityRag: 'Green' }
// API: { velocity: { value: 34, avg: 31.5, rag: 'Green' } }
```

When `includeRolling=false`, `avg` field is omitted from response.
When `includeProgram=false`, `program` field is omitted from response.
