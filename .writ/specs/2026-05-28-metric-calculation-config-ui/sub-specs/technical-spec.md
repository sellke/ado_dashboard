# Technical Spec — Metric Calculation Configuration UI

> Parent: ../spec.md
> Companions: database-schema.md, api-spec.md

## Guiding principle: config flows IN, defaults guarantee zero drift

The metric calculators are already pure functions that take `ThresholdConfigInput[]` as a
parameter. We extend that pattern — config is passed *into* pure functions, never read
from the DB inside them. The DB read stays at the orchestration layer
(`snapshot.ts` / `orchestrator.ts`), exactly where `thresholdConfig.findMany()` runs today.

Every new config input has a **default constant encoding current behavior**. Call sites
and tests that omit config get identical results. This is the regression safety net that
Story 6 proves.

## Types (`lib/metrics/types.ts`)

```ts
export interface MetricEngineConfigInput {
  velocityGreenFloor: number; // default 1.0
  velocityAmberFloor: number; // default 0.7
  rollingWindow: number;      // default 4
}

export type MetricCategory = 'deliveryPoints' | 'overheadHours';

export interface MetricRuleConfigInput {
  category: MetricCategory;
  workItemType: string;
  included: boolean;
}

export const DEFAULT_ENGINE_CONFIG: MetricEngineConfigInput = {
  velocityGreenFloor: 1.0,
  velocityAmberFloor: 0.7,
  rollingWindow: 4,
};

/** Encodes current behavior: Bug & Spike excluded from delivery points. */
export const DEFAULT_DELIVERY_EXCLUDED_TYPES = ['Bug', 'Spike'] as const;
```

A small helper resolves rule rows into a predicate:

```ts
// lib/metrics/config-rules.ts
export function isIncluded(
  rules: MetricRuleConfigInput[],
  category: MetricCategory,
  workItemType: string,
  fallback: boolean
): boolean { /* find row; else fallback that matches current behavior */ }
```

## Refactors

### `lib/metrics/calculators.ts`

Replace `wi.type !== 'Bug' && wi.type !== 'Spike'` with a rules-driven filter for the
`deliveryPoints` category. Each calculator gains an optional `rules` parameter defaulting
to current behavior:

```ts
export function calculateVelocity(
  workItems: WorkItemInput[],
  rules: MetricRuleConfigInput[] = []   // empty → default exclusion preserved
): number { /* filter by isIncluded('deliveryPoints', type, !defaultExcluded) */ }
```

Apply the same change to `calculatePredictability` and `calculateCarryOver`.
`calculateOverhead` keeps its per-type hour formulas; the `overheadHours` inclusion flags
gate *whether* Bug/Spike/Support contribute (default: all true).

### `lib/metrics/rag.ts`

`assignVelocityRag` takes the cutoff ratios (default to current `1.0` / `0.7`):

```ts
export function assignVelocityRag(
  velocity: number | null,
  rollingAvg: number | null,
  cfg: Pick<MetricEngineConfigInput, 'velocityGreenFloor' | 'velocityAmberFloor'> = DEFAULT_ENGINE_CONFIG
): RagColor { /* ratio >= greenFloor → Green; >= amberFloor → Amber; else Red */ }
```

### `lib/metrics/snapshot.ts`

- The prior-snapshot query `take: 4` becomes `take: engineConfig.rollingWindow`.
- Load `MetricEngineConfig` + `MetricRuleConfig` once (alongside the existing
  `thresholdConfig.findMany()`), thread into calculators / `assignVelocityRag`.

### `lib/metrics/trend-service.ts`

- The rolling sprint slice `.slice(0, 4)` in `buildTrendSeries` becomes
  `engineConfig.rollingWindow`. This window drives velocity-rate averaging and the
  delivery-to-bug ratio aggregation (completed points + bug hours over the same sprints).
- Delivery-to-bug RAG continues to use `assignDeliveryToBugRag` with seeded
  `deliveryToBugRatio` thresholds — no formula change; only threshold editing is new.

### `lib/metrics/orchestrator.ts`

Loads config once and passes it to `computeWorkstreamMetrics`. Where it reads thresholds
today, also read engine + rule config (or accept them as injected params for testability).

## Config loader

Add `lib/metrics/config-loader.ts` with a single `loadMetricConfig(db)` returning
`{ thresholds, engine, rules }`, applying default constants for any missing rows. Both the
engine and the GET API use it — single source of truth, no divergence.

## UI (`components/Dashboard/`)

- `MetricConfigPanel.tsx` — modal/drawer with Mantine `Tabs`: **Thresholds**,
  **Inclusion Rules**, **Velocity & Rolling**. Loads via `GET /api/metric-config`.
- **Thresholds tab** shows `overheadPercent`, `carryOverRate`, and `deliveryToBugRatio`
  only. Label `deliveryToBugRatio` as lower-is-healthier; note the zero-bug Green case is
  fixed (not editable). Do not expose milestone/aging/scope-creep rows.
- Entry point: a gear/Settings action in the dashboard header. **Coordinate placement
  with `2026-05-27-dashboard-workstream-config-ui`** so the two config surfaces share a
  consistent home.
- Each tab has its own Save (calls the matching PUT). Inline validation reuses
  `lib/metrics/config-validation.ts`. Success → Mantine notification; failure → field
  errors. A **Recalculate now** button (Story 6) calls `POST /api/metrics/compute` and
  shows progress/completion.

## Testing strategy

- **Regression (Story 2 + 6):** run the engine with no config / seeded defaults and assert
  snapshot output equals a fixture captured from pre-feature code. This is the
  highest-value test — it proves zero drift.
- **Unit:** default constants, `isIncluded`, validators, refactored calculators & RAG.
- **API:** GET shape, PUT validation (reject bad ranges, persist valid), recompute trigger.
- **Component:** panel tabs Save/Cancel/validation with mocked fetch.
- Coverage: ≥80% new code; defaults + validators 100%.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Refactor silently changes metric numbers | Default constants + regression snapshot equality test |
| Velocity cutoffs/rolling window had no storage → easy to mis-wire | Centralize in `MetricEngineConfig` + single loader |
| Tooltip copy in metric-definition-tooltips goes stale | Tracked as explicit follow-up in Story 6 notes; out of scope here |
| Two dashboard config surfaces feel inconsistent | Coordinate entry point with workstream-config-ui spec |
| All-types-excluded rule produces NaN/crash | Treat as valid input; engine returns 0/null gracefully (edge test) |
