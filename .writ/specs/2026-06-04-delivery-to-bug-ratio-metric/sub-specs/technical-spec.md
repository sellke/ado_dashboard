# Technical Spec — Delivery-to-Bug Ratio Metric

> Parent: ../spec.md

## Architecture Fit

The dashboard metric pipeline is:

```
calculators.ts (pure)  →  snapshot.ts (persist MetricSnapshot)  →  trend-service.ts (derive)
   →  route.ts (assemble API)  →  adapter.ts (view models)  →  WorkstreamHealthCard.tsx (render)
```

`velocityRate` is the template: it is **not** a persisted column. It is derived on-the-fly in
`trend-service.ts` from persisted snapshot fields (`velocity`, `grossHours`, `overheadHours`) and
surfaced via the API as `prediction.velocityRate` (workstream) and `program.metrics.averageVelocityRate`.

The delivery-to-bug ratio follows the same pattern. The persisted inputs already exist on every
`MetricSnapshot` row:

- `completedPoints` — done-like delivery points (Bug/Spike excluded), written in `snapshot.ts`.
- `bugHours` — written in `snapshot.ts` from `calculateOverhead(...).bugHours`.

→ **No Prisma migration is required for the metric value.** The only persisted change is one
seeded `ThresholdConfig` row for RAG.

## Calculation (pure functions)

Add to `lib/metrics/trend-service.ts` (co-located with `calculateVelocityRate`):

```ts
/**
 * deliveryToBugRatio = completedPoints (1 SP = 1 hr) / bugHours.
 * Returns null when bugHours is null/undefined or <= 0 (caller decides the
 * "no bug burden" display + RAG). Rounded to 2 decimals.
 */
export function calculateDeliveryToBugRatio(
  completedPoints: number | null | undefined,
  bugHours: number | null | undefined
): number | null {
  if (completedPoints === null || completedPoints === undefined) return null;
  if (bugHours === null || bugHours === undefined || bugHours <= 0) return null;
  return Math.round((completedPoints / bugHours) * 100) / 100;
}
```

**Aggregation = sum-then-divide.** Sum `completedPoints` and `bugHours` independently across the
relevant set (the rolling-window sprints for a workstream; all in-scope workstreams for the
program), then call `calculateDeliveryToBugRatio(sumPoints, sumBugHours)` once. Do **not** average
per-sprint or per-workstream ratios.

`trend-service.ts` snapshot inputs currently expose `velocity`, `grossHours`, `overheadHours`.
Extend `TrendSnapshotInput` with `completedPoints` and `bugHours` (both already selected in the
route's `trendSnapshots` query — `completedPoints` is selected; **add `bugHours` to the select**),
and compute the window/program ratio inside `buildTrendSeries`, returning it on `TrendSeriesResult`
(e.g. `deliveryToBugRatio: number | null`).

## RAG

Add to `lib/metrics/rag.ts`:

```ts
/**
 * RAG for delivery-to-bug ratio (higher = healthier).
 * - bugHours === 0 && completedPoints > 0 → Green (no bug burden is healthy)
 * - bugHours === 0 && completedPoints === 0 → null (nothing to assess)
 * - otherwise → assignRag(ratio, 'deliveryToBugRatio', thresholds)
 */
export function assignDeliveryToBugRag(
  ratio: number | null,
  completedPoints: number | null,
  bugHours: number | null,
  thresholds: ThresholdConfigInput[]
): RagColor {
  if (bugHours === 0 || bugHours === null) {
    if ((completedPoints ?? 0) > 0) return 'Green';
    return null;
  }
  return assignRag(ratio, 'deliveryToBugRatio', thresholds);
}
```

`assignRag` is range-based and already supports "higher is better" when the green band is set high.

## Threshold seed

Add to `thresholdConfigs` in `prisma/seed.ts` (upserted by unique `metricName`, so re-seeding is
idempotent and existing rows are untouched):

```ts
{
  metricName: 'deliveryToBugRatio',
  greenMin: 4,
  greenMax: 999999,
  amberMin: 2,
  amberMax: 3.99,
  redMin: 0,
  redMax: 1.99,
},
```

(Match the exact field set used by the other entries — confirm `redMin`/`redMax` presence against
the current `thresholdConfigs` shape and the `ThresholdConfig` Prisma model before writing.)

## API surface (`app/api/metrics/route.ts`)

- Add `bugHours: true` to the `trendSnapshots` select (and ensure `completedPoints: true` remains).
- Per workstream: compute the window ratio via `buildTrendSeries(...).deliveryToBugRatio` and its
  RAG via `assignDeliveryToBugRag`, using the `thresholds` already fetched for the program block
  (hoist the `thresholdConfig.findMany()` if currently scoped inside the `includeProgram` branch).
- Surface on the workstream response — reuse the `prediction` object (where `velocityRate` lives)
  or add a sibling field. Recommended: add `deliveryToBugRatio` + `deliveryToBugRag` to the
  workstream `metrics`/`prediction` shape so the adapter reads it like `velocityRate`.
- Program: compute Σ points ÷ Σ bug hours across in-scope workstreams; add
  `deliveryToBugRatio` + `deliveryToBugRag` to `program.metrics`.

## View model (`lib/dashboard/adapter.ts` + `types.ts`)

- `types.ts`: add the new fields to `ApiWorkstream.prediction` (or `metrics`) and
  `ApiResponse.program.metrics`; nothing new in `MetricTileViewModel` (it already carries `rag`,
  `metricId`, `value`, `rawValue`).
- `adapter.ts`:
  - Insert a **"Delivery/Bug"** tile on each workstream card (next to the spliced "Velocity Rate"
    tile), formatted to 2 decimals; `—` when ratio is null but `deliveryToBugRag === 'Green'`;
    `N/A` when null and no RAG. `metricId: 'deliveryToBugRatio'`, `rag` mapped via `toRagStatus`.
  - Add an **"Avg Total Delivery/Bug"** tile to `programMetrics` alongside
    "Avg Total Velocity Rate".

## Definitions (`lib/metrics/definitions.ts`)

- Add `'deliveryToBugRatio'` to the `MetricId` union.
- Add a registry entry: `definition`, `calculation` (state 1 SP = 1 hr, sum-then-divide, window +
  program scope, `—` when no bugs), and `ragExplanation` ("Green ≥ 4, Amber 2–3.99, Red < 2;
  higher is healthier").

## Component (`components/Dashboard/WorkstreamHealthCard.tsx`)

No structural change required — the metric list and the program tile row render generically with
`RagBadge` + `MetricDefinitionHint` keyed by `metricId`. Verify the new tile flows through and the
`getRagTooltip('deliveryToBugRatio')` returns the RAG copy.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Compute ratio | `bugHours = 0` | Return null; caller shows `—`, Green if delivery>0 else null RAG | Unit: 5/0 → null+Green, 0/0 → null+null |
| Compute ratio | null completedPoints/bugHours | Return null → `N/A` | Unit: null inputs |
| RAG assign | `deliveryToBugRatio` threshold row missing | `assignRag` returns null → no badge (degrades gracefully) | Unit: empty thresholds |
| API select | `bugHours` not selected | Ratio always null → wrong `N/A` | Route test asserts populated ratio |
| Aggregation | averaging ratios instead of sum-then-divide | Skews small-denominator streams | Unit: multi-stream sum-then-divide vs avg |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| WS card tile | `3.50` + RAG badge | null points → `N/A` | `bugHours=0`,pts>0 → `—`+Green | metrics fetch fails → dashboard error view |
| Program tile | `Σpts/Σbugh` + RAG | all null → `N/A` | all `bugHours=0` → `—`+Green/null | program null → tile absent (existing) |

## Out of Scope

- Per-sprint trend chart for the ratio (`[OUT OF SCOPE — Medium effort; tiles only per contract]`).
- PowerPoint/slides export of the ratio (`[OUT OF SCOPE — contract excluded]`).
- Configurable thresholds UI (`[OUT OF SCOPE — seeded threshold only]`).
- Any Prisma migration (`[OUT OF SCOPE — derived metric]`).
