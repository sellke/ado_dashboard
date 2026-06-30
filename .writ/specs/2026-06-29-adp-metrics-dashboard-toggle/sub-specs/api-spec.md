# API Spec: ADP Metrics Dashboard Toggle

> Parent: `.writ/specs/2026-06-29-adp-metrics-dashboard-toggle/spec.md`
> Story: 1

## Overview

Extends existing metric config endpoints. No new routes.

## GET `/api/metric-config`

**Response (unchanged shape, extended engine):**

```json
{
  "thresholds": [ /* ... */ ],
  "engine": {
    "velocityGreenFloor": 1.0,
    "velocityAmberFloor": 0.7,
    "rollingWindow": 4,
    "cycleTimeRollingWindow": 4,
    "includeAdpMetrics": true
  },
  "rules": [ /* ... */ ]
}
```

When engine row missing, `includeAdpMetrics` defaults to `true` via loader.

## PUT `/api/metric-config/rules`

**Request body (extended):**

```json
{
  "rules": [
    { "category": "deliveryPoints", "workItemType": "Bug", "included": false }
  ],
  "includeAdpMetrics": false
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `rules` | `MetricRuleConfigInput[]` | Yes | Existing `validateRuleConfigs` |
| `includeAdpMetrics` | `boolean` | No | If present, must be boolean; if absent, leave engine flag unchanged |

**Behavior:**

1. Validate `rules` (existing).
2. If `includeAdpMetrics` present and not boolean → 422.
3. Transaction:
   - Upsert each rule (existing).
   - If `includeAdpMetrics` provided: upsert `metricEngineConfig` where `key = 'default'`, set `includeAdpMetrics`.
4. Reload config; return:

```json
{
  "rules": [ /* merged rules */ ],
  "includeAdpMetrics": false
}
```

**Response codes:**

| Code | Condition |
|---|---|
| 200 | Success |
| 422 | Validation errors |
| 500 | DB/server error |

## Unchanged Endpoints

- `PUT /api/metric-config/thresholds` — does not modify `includeAdpMetrics`.
- `PUT /api/metric-config/engine` — may optionally accept `includeAdpMetrics` in a follow-up for consistency, but **not required** for this spec (Inclusion Rules save owns the flag).

## Client Usage

| Consumer | Usage |
|---|---|
| `MetricConfigPanel` | Load via GET; save via rules PUT with checkbox value |
| `DashboardContainer` | GET on mount; read `engine.includeAdpMetrics` |

## `/api/milestones`

No API changes. Client simply stops calling when ADP excluded.
