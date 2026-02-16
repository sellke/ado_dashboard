# API Specification — Manual Milestone Entry

> Parent Spec: `../spec.md`
> Created: 2026-02-13

## Endpoints

### `GET /api/milestones`

Fetch milestone list for dashboard display.

**Query params (optional):**
- `workstreamId` (string)
- `status` (`NotStarted` | `InProgress` | `Done`)
- `targetMonth` (ISO date, month match by UTC month/year)

**200 Response (example):**

```json
{
  "items": [
    {
      "id": "cm123",
      "title": "LL Search rollout",
      "adoFeatureId": 12345,
      "workstreamId": "cw123",
      "targetMonth": "2026-03-01T00:00:00.000Z",
      "status": "InProgress",
      "notes": "Blocked on API dependency",
      "createdAt": "2026-02-13T14:00:00.000Z",
      "updatedAt": "2026-02-13T14:00:00.000Z",
      "workstream": { "id": "cw123", "name": "Streams" }
    }
  ]
}
```

### `POST /api/milestones`

Create milestone.

**Request body:**
- `title` (required, non-empty string)
- `workstreamId` (required, existing workstream ID)
- `targetMonth` (required ISO date string)
- `status` (optional; defaults to `NotStarted`)
- `adoFeatureId` (optional integer)
- `notes` (optional string)

**Responses:**
- `201` created object
- `400` invalid payload
- `404` unknown workstream

### `PATCH /api/milestones/[id]`

Update any editable milestone fields.

**Request body:**
- one or more of `title`, `targetMonth`, `status`, `adoFeatureId`, `notes`, `workstreamId`

**Responses:**
- `200` updated object
- `400` invalid payload
- `404` milestone or workstream not found

### `DELETE /api/milestones/[id]`

Delete milestone.

**Responses:**
- `204` deleted
- `404` milestone not found

## Validation Rules

- `title`: trim; reject empty
- `targetMonth`: valid date required; normalize to month-start UTC for consistency
- `status`: enum strict match
- `adoFeatureId`: integer if provided
- `workstreamId`: must resolve to existing workstream record

## Notes on Compatibility

- API shape should be explicit and stable for dashboard panel consumption.
- Route implementation should follow conventions in existing routes under `app/api/`.
- No contract changes required in `/api/metrics`; milestones are separate concern.

# Manual Milestone Entry â€” API Specification

> Parent spec: `../spec.md`
> Created: 2026-02-13

## Endpoints

### GET /api/milestones

List all milestones with optional workstream filtering.

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| workstreamId | string | No | Filter by workstream ID |

**Response 200:**
```json
{
  "milestones": [
    {
      "id": "clx...",
      "title": "Streams v2.0 Release",
      "adoFeatureId": 12345,
      "workstreamId": "clx...",
      "targetMonth": "2026-03-01T00:00:00.000Z",
      "status": "InProgress",
      "notes": "On track for March delivery",
      "createdAt": "2026-02-13T...",
      "updatedAt": "2026-02-13T...",
      "workstream": {
        "id": "clx...",
        "name": "Streams"
      }
    }
  ]
}
```

### POST /api/milestones

Create a new milestone.

**Request Body:**
```json
{
  "title": "Streams v2.0 Release",
  "workstreamId": "clx...",
  "targetMonth": "2026-03-01T00:00:00.000Z",
  "status": "NotStarted",
  "adoFeatureId": 12345,
  "notes": "Q4 commitment"
}
```

| Field | Type | Required | Default | Validation |
|-------|------|----------|---------|------------|
| title | string | Yes | â€” | Non-empty, trimmed |
| workstreamId | string | Yes | â€” | Must exist in DB |
| targetMonth | string | Yes | â€” | Valid ISO date |
| status | string | No | NotStarted | NotStarted, InProgress, Done |
| adoFeatureId | number | No | null | Positive integer |
| notes | string | No | null | â€” |

**Response 201:** Created milestone object (same shape as GET item)
**Response 400:** `{ "error": "Validation failed", "details": { "title": "Title is required" } }`

### PUT /api/milestones/[id]

Update an existing milestone.

**Request Body:** Same shape as POST (all fields optional except at least one must be present)

**Response 200:** Updated milestone object
**Response 400:** Validation errors
**Response 404:** `{ "error": "Milestone not found" }`

### DELETE /api/milestones/[id]

Delete a milestone.

**Response 204:** No content
**Response 404:** `{ "error": "Milestone not found" }`

## Related Stories

- Story 1: Implements these API routes
- Story 4: Client-side hook (`useMilestones`) consumes these endpoints
