# Story 2 — Config-driven engine refactor

> **Status:** Completed ✅
> **Completed:** 2026-06-12
> **Priority:** High (foundation)
> **Dependencies:** Story 1

## User Story

As a **maintainer**, I want **the metric calculators, velocity RAG, and rolling window to
read configuration instead of hardcoded constants**, so that **changing config changes
metric output — while default config reproduces today's exact numbers**.

## Acceptance Criteria

1. **Given** no config supplied (defaults), **when** the engine computes a sprint, **then**
   output is byte-for-byte identical to pre-feature behavior (regression fixture).
2. **Given** a `deliveryPoints` rule that includes Bug, **when** velocity is computed,
   **then** Bug story points are counted.
3. **Given** `velocityGreenFloor=1.2`, **when** a velocity at 1.1× rolling avg is graded,
   **then** RAG is Amber (was Green at default 1.0).
4. **Given** `rollingWindow=2`, **when** rolling averages compute, **then** only the 2 most
   recent prior snapshots are used.

## Implementation Tasks

- [x] Add default-regression coverage for current engine output behavior
- [x] Add `lib/metrics/config-rules.ts` (`isIncluded` helper) + tests
- [x] Add `lib/metrics/config-loader.ts` (`loadMetricConfig`) with default fallback + tests
- [x] Refactor `calculateVelocity`/`calculatePredictability`/`calculateCarryOver` to accept rules (default = current exclusion)
- [x] Refactor `assignVelocityRag` to accept cutoff ratios (default `1.0`/`0.7`)
- [x] Thread `rollingWindow` into prior-snapshot `take` in `snapshot.ts` and `.slice(0, N)`
  in `trend-service.ts`; load + pass config in `snapshot.ts`/`orchestrator.ts`
- [x] Verify default-regression tests pass (includes deliveryToBugRatio-related trend behavior)

## Technical Notes

See `sub-specs/technical-spec.md` → "Refactors". Config is passed *into* pure functions;
DB read stays at orchestration layer. Default constants are the zero-drift guarantee.

## Definition of Done

- [x] All hardcoded constants (`!=='Bug'/'Spike'`, `1.0`, `0.7`, `take: 4`,
  `slice(0, 4)`) sourced from config
- [x] Default-regression tests green with default config
- [x] Existing metric tests still pass
- [x] ≥80% coverage new code; 100% on config-rules + loader

## Context for Agents

- Hardcoded sites: `calculators.ts` (`!=='Bug' && !=='Spike'`),
  `rag.ts` `assignVelocityRag` (`1.0`/`0.7`), `snapshot.ts` (`take: 4`),
  `trend-service.ts` (`slice(0, 4)` in `buildTrendSeries`).
- `assignRag` and `assignDeliveryToBugRag` already read `ThresholdConfigInput[]` — no
  formula change for delivery-to-bug; threshold editing is UI/API only.
- Edge case to cover: all types excluded for a category → 0/null, no crash.

---

## What Was Built

**Implementation Date:** 2026-06-12

### Files Created

1. **`lib/metrics/config-rules.ts`**
   - Adds default category inclusion behavior and `isIncluded` rule resolution.
2. **`lib/metrics/config-loader.ts`**
   - Loads `{ thresholds, engine, rules }` and fills missing engine, threshold, and rule rows from defaults.
3. **`__tests__/lib/metrics/config-rules.test.ts`**
   - Covers default inclusion and explicit rule overrides.
4. **`__tests__/lib/metrics/config-loader.test.ts`**
   - Covers persisted config load plus missing-row fallback behavior.

### Files Modified

- **`lib/metrics/calculators.ts`**
  - Delivery-point calculators now accept optional rule config; overhead inclusion flags gate Bug/Spike/Support hour contribution.
- **`lib/metrics/rag.ts`**
  - `assignVelocityRag` now accepts configurable amber/green floors while defaulting to existing cutoffs.
- **`lib/metrics/snapshot.ts`**
  - Loads/passes metric config, uses configured rolling window, and threads rules/cutoffs into calculators/RAG.
- **`lib/metrics/orchestrator.ts`**
  - Loads metric config once per compute pass and passes it to workstream and program aggregation.
- **`lib/metrics/aggregator.ts`**
  - Program velocity RAG now uses configured velocity cutoffs.
- **`lib/metrics/trend-service.ts`**
  - Trend aggregation accepts `rollingWindow` and applies it for current and no-current paths.
- **`app/api/metrics/route.ts`**
  - Uses `loadMetricConfig` and passes configured rolling window into trend builders.
- **Metric tests**
  - Expanded calculator, RAG, snapshot, trend, orchestrator, aggregator, and loader coverage for configurable behavior.

### Implementation Decisions

1. **Defaults remain zero-drift** — missing rule rows fall back to current behavior: delivery points include all types except Bug and Spike; overhead includes Bug, Spike, and Support.
2. **Config stays at orchestration boundaries** — pure calculators still receive config as arguments and do not read the database.
3. **Threshold fallback added to loader** — missing `ThresholdConfig` rows are filled from default constants so API/engine behavior remains stable when config rows are absent.

### Test Results

**Verification:** `pnpm exec jest __tests__/lib/metrics/config-rules.test.ts __tests__/lib/metrics/config-loader.test.ts __tests__/lib/metrics/calculators.test.ts __tests__/lib/metrics/rag.test.ts __tests__/lib/metrics/trend-service.test.ts __tests__/lib/metrics/snapshot.test.ts __tests__/lib/metrics/orchestrator.test.ts __tests__/lib/metrics/aggregator.test.ts --runInBand`
- ✅ 123/123 focused metric tests passing
- ✅ Review pass: no remaining Story 2 findings
- ⚠️ `pnpm run typecheck` remains blocked by baseline errors in `app/api/metrics/route.ts` and `lib/sync/ado-client.ts`

### Review Outcome

**Result:** PASS

- **Iteration count:** 2 review iterations
- **Drift:** None after fixes
- **Security:** Low risk; no auth/secrets surface added
- **Boundary Compliance:** Story 2 edits stayed within metric engine/API trend wiring and related tests

### Deviations from Spec

None.
