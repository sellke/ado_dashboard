# API Spec — `GET /api/metrics` sprintId-anchored window

> Parent: ../spec.md
> Endpoint: `app/api/metrics/route.ts`

## Summary

No new endpoint. This spec changes the semantics of the existing optional `sprintId` query param so that the rolling trend window is anchored to the selected sprint rather than always reflecting the latest 5 sprints.

## Request

`GET /api/metrics`

| Param | Type | Default | Behavior |
|---|---|---|---|
| `sprintId` | string (optional) | latest sprint with a snapshot | Resolves the focus sprint AND anchors the rolling window: 5 sprints with `startDate <= resolvedSprint.startDate`, ordered desc. |
| `dashboard` | string | `main` | Unchanged. |
| `workstreamIds` | string (scoped) | dashboard default | Unchanged. |
| `includeRolling` | boolean | true | Unchanged. |
| `includeProgram` | boolean | true | Unchanged. |

### Client usage

- Current sprint selected (default): **omit** `sprintId` — preserves existing default resolution and current-sprint forecast behavior.
- Previous sprint selected: send `sprintId=<selected>` — server returns the anchored historical window.

## Response (shape unchanged)

The response shape is unchanged. Semantics that change for a past-anchored window:

| Field | Change for past window |
|---|---|
| `sprint` | The selected (past) sprint. |
| `rollingWindow.sprints` | Up to 5 sprints ending at the selected sprint (was: latest 5). |
| `rollingWindow.currentSprintId` | `null` when the window contains no live-current sprint. |
| `workstreams[].trends.sprints` | All entries `mode: 'actual'`; no `mode: 'current'` entry appended. |
| `workstreams[].trends.sprints[].activeBugs/bugsClosed` | Computed as-of each sprint (not from today's open count). |
| `workstreams[].prediction` | `velocity: null` for past windows (forecast suppressed). |
| `program.trends` / `program.prediction` | Same gating applied at program level. |

## Status codes

| Code | Condition |
|---|---|
| 200 | Success (including empty `sprint: null` when sprintId not found / no snapshots). |
| 400 | Invalid `workstreamIds` (existing validation, unchanged). |
| 500 | Unhandled error (existing catch, unchanged). |

## Backward compatibility

- Requests without `sprintId` behave exactly as before (latest sprint, latest-5 window, current-sprint forecast).
- The response contract (keys/types) is unchanged; only values shift for past-anchored requests, so existing consumers and the export pipeline remain compatible.
