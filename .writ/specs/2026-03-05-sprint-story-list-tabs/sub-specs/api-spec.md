# API Specification — Sprint Stories Endpoint

## Endpoint

```
GET /api/sprints/stories
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `workstreamId` | `string` (UUID) | Yes | — | Filter stories to a specific workstream |

## Response

### 200 OK

```json
{
  "sprints": [
    {
      "id": "clxyz123...",
      "name": "Sprint 2026.04",
      "startDate": "2026-02-24T00:00:00.000Z",
      "endDate": "2026-03-07T00:00:00.000Z",
      "isCurrent": true,
      "stories": [
        {
          "adoId": 12345,
          "title": "Implement user authentication flow",
          "assignedTo": "Jane Doe",
          "storyPoints": 5,
          "state": "Active",
          "statusGroup": "Active"
        },
        {
          "adoId": 12346,
          "title": "Design login page wireframes",
          "assignedTo": null,
          "storyPoints": 3,
          "state": "New",
          "statusGroup": "Planned"
        }
      ]
    },
    {
      "id": "clxyz124...",
      "name": "Sprint 2026.03",
      "startDate": "2026-02-10T00:00:00.000Z",
      "endDate": "2026-02-21T00:00:00.000Z",
      "isCurrent": false,
      "stories": []
    }
  ]
}
```

### Field Descriptions

#### Sprint Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Sprint primary key (CUID) |
| `name` | `string` | Sprint display name (e.g., "Sprint 2026.04") |
| `startDate` | `string` (ISO 8601) | Sprint start date |
| `endDate` | `string` (ISO 8601) | Sprint end date |
| `isCurrent` | `boolean` | `true` if today falls within startDate–endDate |
| `stories` | `Story[]` | User Stories in this sprint for the requested workstream |

#### Story Object

| Field | Type | Description |
|-------|------|-------------|
| `adoId` | `number` | ADO work item ID |
| `title` | `string` | Work item title |
| `assignedTo` | `string \| null` | Assigned person display name, or null if unassigned |
| `storyPoints` | `number \| null` | Story point estimate, or null if unestimated |
| `state` | `string` | Raw ADO state (New, Approved, Active, etc.) |
| `statusGroup` | `string` | Mapped display group: Planned, Active, Resolved, or Completed |

### Error Responses

#### 400 Bad Request

```json
{
  "error": "workstreamId query parameter is required"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Failed to fetch sprint stories"
}
```

## Status Group Mapping

| ADO State | Status Group |
|-----------|-------------|
| New | Planned |
| Approved | Planned |
| Committed | Planned |
| Active | Active |
| Resolved | Resolved |
| Closed | Completed |

Work items with states not listed above (e.g., Removed) are excluded from the response entirely.

## Sprint Window

Returns the **rolling 5-sprint window** — the same window used by the velocity trend chart:
- Current sprint (by date)
- 4 most recent prior sprints

Sprints are ordered **most recent first** in the response array.

## Usage Example

```typescript
// Fetch stories for a specific workstream
const res = await fetch('/api/sprints/stories?workstreamId=clxyz789');
const data: SprintStoriesApiResponse = await res.json();

// Find current sprint
const currentSprint = data.sprints.find(s => s.isCurrent);

// Group stories by status
const planned = currentSprint?.stories.filter(s => s.statusGroup === 'Planned') ?? [];
const active = currentSprint?.stories.filter(s => s.statusGroup === 'Active') ?? [];
```
