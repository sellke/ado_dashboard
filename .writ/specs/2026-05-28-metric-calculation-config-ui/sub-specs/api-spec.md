# API Spec — Metric Calculation Configuration UI

> Parent: ../spec.md
> Stories: Story 3 (config API + validation), Story 6 (recalc trigger)

## Routes

All routes live under `app/api/metric-config/`. They follow the existing Next.js App
Router handler style used by `app/api/metrics/route.ts`.

### `GET /api/metric-config`

Returns the full current configuration in one payload (the settings panel loads once).

```json
{
  "thresholds": [
    { "metricName": "overheadPercent", "greenMin": 0, "greenMax": 30, "amberMin": 30.01, "amberMax": 45 }
  ],
  "engine": { "velocityGreenFloor": 1.0, "velocityAmberFloor": 0.7, "rollingWindow": 4 },
  "rules": [
    { "category": "deliveryPoints", "workItemType": "Bug", "included": false }
  ]
}
```

- Missing rows → response is filled from the **default constants** (engine never depends
  on rows existing). 200 always when DB reachable.

### `PUT /api/metric-config/thresholds`

Body: `{ thresholds: ThresholdConfigInput[] }`. Upserts each by `metricName`.

### `PUT /api/metric-config/engine`

Body: `{ velocityGreenFloor, velocityAmberFloor, rollingWindow }`. Upserts the singleton.

### `PUT /api/metric-config/rules`

Body: `{ rules: { category, workItemType, included }[] }`. Upserts by
`[category, workItemType]`.

### `POST /api/metrics/compute` (existing — reused for Recalculate now)

Story 6 wires the "Recalculate now" button to the existing compute endpoint. No new route.

## Validation (Error & Rescue Map)

Validation is shared between API handlers and the UI (extract pure validators into
`lib/metrics/config-validation.ts` so both consume them).

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| PUT thresholds | greenMin > greenMax | 422 + `{field, message}` per row | Unit validator + API test |
| PUT thresholds | amberMin > amberMax | 422 + field error | Unit + API |
| PUT thresholds | gap producing undefined-RAG band | 422 + explanation | Unit covering `assignRag` semantics |
| PUT engine | velocityAmberFloor ≤ 0 | 422 | Unit + API |
| PUT engine | velocityAmberFloor > velocityGreenFloor | 422 | Unit + API |
| PUT engine | rollingWindow < 1 or non-integer | 422 | Unit + API |
| PUT rules | unknown category / type | 422 (reject) | API test |
| PUT rules | all types excluded for a category | **Accept** (valid) but engine yields 0/null gracefully | Engine edge-case test |
| Any GET/PUT | DB unavailable | 500 + recoverable panel error; active config unchanged | Integration with DB down |
| Recalculate | compute endpoint error | Surface error toast; config already saved | API test |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Load config | Panel renders current values | No rows → default constants shown | N/A | Panel error, retry prompt |
| Save thresholds | Toast + persisted | N/A | Empty array → no-op 200 | 422 field errors / 500 toast |
| Recalculate | Snapshots recomputed, dashboard updates | No sprints → 4xx message | N/A | Error toast, config intact |

## Response conventions

- Mirror existing metrics routes: JSON, `NextResponse.json`, appropriate status codes.
- 422 body shape: `{ errors: { field: string, message: string }[] }`.
