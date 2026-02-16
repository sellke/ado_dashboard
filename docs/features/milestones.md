# Milestones

Feature-level monthly milestones per workstream. Supports manual entry and programmatic management via REST API.

## Overview

- **CRUD API**: `GET`, `POST`, `PATCH`, `DELETE` on `/api/milestones` and `/api/milestones/[id]`
- **Validation**: Shared validation in `lib/milestones/validation.ts` (`validateCreate`, `validateUpdate`)
- **Status**: `NotStarted`, `InProgress`, `Done` — defaults to `NotStarted` on create
- **Dashboard UI**: See [Dashboard Milestone Panel](dashboard-milestone-panel.md) for the `/dashboard` panel grouping milestones by workstream, status badges, and CRUD actions

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/milestones` | List milestones (optional `?workstreamId=xyz` filter), ordered by targetMonth |
| POST | `/api/milestones` | Create milestone; required: `title`, `workstreamId`, `targetMonth` |
| PATCH | `/api/milestones/[id]` | Update milestone (partial) |
| DELETE | `/api/milestones/[id]` | Delete milestone |

## Validation Rules

- **title**: Required, non-empty trimmed string
- **workstreamId**: Required (create); must reference existing workstream
- **targetMonth**: Required (create); valid ISO date string
- **status**: Optional; one of `NotStarted`, `InProgress`, `Done`
- **adoFeatureId**: Optional positive integer
- **notes**: Optional string

## Error Semantics

| Code | Condition |
|------|-----------|
| 400 | Invalid JSON body, missing required fields, invalid values, or workstreamId not found |
| 404 | Milestone not found (PATCH/DELETE) |
| 500 | Server error |

See [API Reference](../API.md#milestones-api-story-1) for full request/response shapes.
