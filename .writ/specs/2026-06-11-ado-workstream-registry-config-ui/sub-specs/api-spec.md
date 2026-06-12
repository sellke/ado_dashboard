# API Spec — ADO Workstream Registry Config UI

> Parent: ../spec.md
> Stories: Story 2 (discovery), Story 3 (registry CRUD)

## Discovery routes (`app/api/ado/`)

Read-only; proxy ADO REST using `ADO_ORG` + `ADO_PAT`. Used by admin UI pickers.

### `GET /api/ado/projects`

Returns projects visible to the PAT.

```json
{ "projects": [{ "id": "...", "name": "Event Streaming Platform" }] }
```

### `GET /api/ado/teams?project={projectIdOrName}`

Returns teams (boards) in the project.

```json
{
  "teams": [
    { "id": "ae8bcdaa-...", "name": "Streams", "projectName": "Event Streaming Platform" }
  ]
}
```

Optional: `GET /api/ado/teams/{teamId}/default-area?project=...` to suggest area path.

## Registry routes (`app/api/workstreams/`)

### `GET /api/workstreams` (extend existing)

Backward-compatible for dashboard scope modal. Add optional `?includeDisabled=true` for admin.

```json
{
  "workstreams": [
    {
      "id": "...",
      "name": "Streams",
      "adoAreaPath": "Event Streaming Platform\\App\\...",
      "adoOrg": "Operations-Innovation",
      "adoProject": "Event Streaming Platform",
      "adoTeamId": "ae8bcdaa-...",
      "syncEnabled": true
    }
  ]
}
```

Default GET (no query) returns only `syncEnabled: true` rows with `{ id, name, adoAreaPath }`
for backward compatibility — OR always return full shape if clients ignore extra fields.

### `POST /api/workstreams`

Body: `{ name, adoOrg, adoProject, adoTeamId, adoAreaPath, syncEnabled? }`.

Validates team reachable (optional lightweight ADO probe). Returns 201 + created row.

### `PUT /api/workstreams/[id]`

Partial or full update of mapping fields. Cannot change `id`.

### `DELETE /api/workstreams/[id]`

- **204** when no related synced data.
- **409** when related data exists: `{ error, relatedCounts: { workItems, ... } }`.

### `PATCH /api/workstreams/[id]/sync-enabled`

Body: `{ syncEnabled: boolean }`. Always allowed — used when delete is blocked.

## Program config (`app/api/sync-config/`)

### `GET /api/sync-config`

Returns `SyncProgramConfig` singleton (iteration team, project, lookback).

### `PUT /api/sync-config`

Update program-level settings. Validates `lookbackSprintCount >= 1`.

## Validation (Error & Rescue Map)

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| GET ado/projects | PAT missing / ADO 401 | 503 + message | API test with env mock |
| GET ado/teams | Unknown project | 404 | API test |
| POST workstream | Duplicate name | 422 | Unit + API |
| POST workstream | Empty area path | 422 | Unit + API |
| DELETE workstream | FK references | 409 + counts | Integration with seeded data |
| Any write | DB unavailable | 500 | Integration |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Load registry | List renders | No rows → seed on first sync path | N/A | Panel error |
| Add workstream | 201 + toast | N/A | Missing required field → 422 | ADO 503 on team list |
| Delete | 204 removed | N/A | N/A | 409 → offer disable |
