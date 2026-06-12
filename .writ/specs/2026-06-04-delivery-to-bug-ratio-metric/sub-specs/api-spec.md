# API Spec — Delivery-to-Bug Ratio Metric

> Parent: ../spec.md
> Endpoint: `GET /api/metrics` (existing — additive fields only)

No new endpoints. The ratio is added to the existing `GET /api/metrics` response as derived,
non-persisted fields, alongside `velocityRate` / `averageVelocityRate`.

## Request

Unchanged. Existing params (`sprintId`, `workstreamId`, `includeRolling`, `includeProgram`,
`dashboard`, scoped workstream ids) all behave as before.

## Response additions

### Per workstream

Add to each `workstreams[].prediction` (where `velocityRate` already lives) — or the
`workstreams[].metrics` block, chosen to match the adapter read path:

```jsonc
{
  "prediction": {
    "velocity": 42,
    "velocityRate": 0.85,
    "deliveryToBugRatio": 3.5,      // NEW — Σ completedPoints / Σ bugHours over rolling window
    "deliveryToBugRag": "Amber",    // NEW — "Green" | "Amber" | "Red" | null
    "mode": "predicted",
    "formula": "average velocity rate × current sprint net capacity hours"
  }
}
```

### Program

Add to `program.metrics` (alongside `averageVelocityRate`):

```jsonc
{
  "program": {
    "metrics": {
      "averageVelocityRate": 0.83,
      "deliveryToBugRatio": 4.10,    // NEW — Σ completedPoints / Σ bugHours across in-scope workstreams
      "deliveryToBugRag": "Green"    // NEW
    }
  }
}
```

## Field semantics

| Field | Type | Meaning |
|---|---|---|
| `deliveryToBugRatio` | `number \| null` | Σ completed delivery points ÷ Σ bug hours, sum-then-divide, 2-dp rounded. `null` when bug hours ≤ 0 or completed points unavailable. |
| `deliveryToBugRag` | `"Green"\|"Amber"\|"Red"\|null` | RAG by seeded `deliveryToBugRatio` threshold; `Green` when bugHours=0 & delivery>0; `null` when bugHours=0 & delivery=0, or threshold row missing. |

## Behavior matrix

| State | `deliveryToBugRatio` | `deliveryToBugRag` | Tile render |
|---|---|---|---|
| points>0, bugHours>0, ratio≥4 | e.g. `5.0` | `Green` | `5.00` + green |
| points>0, bugHours>0, 2≤ratio<4 | e.g. `3.5` | `Amber` | `3.50` + amber |
| points>0, bugHours>0, ratio<2 | e.g. `1.2` | `Red` | `1.20` + red |
| points>0, bugHours=0 | `null` | `Green` | `—` + green |
| points=0, bugHours=0 | `null` | `null` | `—` (no badge) |
| no snapshot / null inputs | `null` | `null` | `N/A` (no badge) |

## Backward compatibility

- All fields are additive and optional in the TypeScript types — existing consumers that don't
  read them are unaffected.
- `includeProgram=false` omits the program block entirely (and thus the program ratio), as today.
- No change to `velocity`, `overheadPercent`, `predictability`, `carryOverRate`, or
  `velocityRate` payloads.
