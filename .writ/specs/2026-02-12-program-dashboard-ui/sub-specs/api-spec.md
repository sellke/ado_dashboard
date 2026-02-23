# Program Dashboard UI - API Specification

> Created: 2026-02-12
> Updated: 2026-02-16 (Change Request)
> Purpose: Frontend consumption contract for dashboard rendering

## Endpoints Used

### GET /api/metrics

Reads computed metric snapshots and trend-series values for the dashboard.

### POST /api/sync/ado

Triggers a full rolling-window ADO refresh from the dashboard action.

**Dashboard usage contract:**

- Call as a single-action `Sync Now` control.
- No confirmation step before submission.
- Full refresh only (omit body or send `{ "syncType": "Full" }`).
- On completion, immediately refetch `GET /api/metrics`.

## Query Parameters

| Param | Type | Default | UI Usage |
|---|---|---|---|
| `sprintId` | string | latest snapshot sprint | Optional targeted sprint view |
| `workstreamId` | string | all | Usually omitted for full dashboard |
| `includeRolling` | boolean | true | Keep true for context display |
| `includeProgram` | boolean | true | Required for summary section |

## Required Response Fields (Baseline)

- `sprint.id`
- `sprint.name`
- `computedAt`
- `program.metrics.velocity|overheadPercent|predictability|carryOverRate`
- `workstreams[].workstreamId`
- `workstreams[].workstreamName`
- `workstreams[].metrics.*`
- `workstreams[].detail.plannedPoints|completedPoints|carryOverItems|carryOverPoints`

## Required Response Fields (New, Additive)

- `program.trends.sprints[]` (Sprint 1-4)
  - `sprintId`
  - `sprintName`
  - `velocity`
  - `velocityRate`
  - `activeBugs`
  - `bugsClosed`
  - `mode` (`actual`)
- `program.prediction.sprint5`
  - `velocity`
  - `mode` (`predicted`)
  - `formula` (human-readable string)
- `workstreams[].trends.sprints[]` (Sprint 1-4)
  - `sprintId`
  - `sprintName`
  - `velocity`
  - `velocityRate`
  - `activeBugs`
  - `bugsClosed`
  - `mode` (`actual`)

## Formula and Counting Contract

- `velocityRate = doneLikeStoryPoints / netCapacityHours`
- `netCapacityHours = totalHours - overhead - bugHours - spikeHours - supportHours`
- Sprint 5 predicted velocity:
  - `averageVelocityRate * currentSprintNetCapacityHours`
- `bugsClosed`: bug items in `Closed|Done|Resolved`, assigned to that sprint
- `activeBugs`: bug items in non-done-like states, assigned to that sprint

## Null and Empty Handling Contract

- If endpoint returns no snapshots:
  - `sprint: null`
  - `workstreams: []`
  - `program: null`
  - `computedAt: null`
- UI treats this as empty state, not an error.
- If trend values are partially unavailable:
  - return nulls at field level
  - keep series structure intact
  - UI renders `N/A`

## Error Handling Contract

- `400` for invalid query parameter input
- `500` for unexpected server failure
- UI behavior:
  - Show non-blocking error panel
  - Offer retry action
  - Avoid rendering malformed partial data
  - For sync failures, preserve current metric view while surfacing sync-specific feedback
