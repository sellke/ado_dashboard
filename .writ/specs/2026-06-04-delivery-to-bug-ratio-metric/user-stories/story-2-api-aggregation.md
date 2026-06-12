# Story 2 — API Derivation and Aggregation

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a **dashboard data consumer**,
I want **the API to derive and aggregate the delivery-to-bug ratio (and its RAG) for each workstream and the program**,
so that **the UI can read the metric the same way it reads `velocityRate`, with correct sum-then-divide aggregation**.

## Acceptance Criteria

1. **Given** rolling-window snapshots for a workstream, **when** `buildTrendSeries` runs, **then**
   it returns `deliveryToBugRatio = round(Σ completedPoints ÷ Σ bugHours, 2)` over the window
   (sum-then-divide), or `null` per the calculator's zero/null rules.
2. **Given** multiple in-scope workstreams, **when** the program aggregate is computed, **then** the
   program ratio is `Σ completedPoints across workstreams ÷ Σ bugHours across workstreams` — **not**
   an average of per-workstream ratios.
3. **Given** the `GET /api/metrics` response, **when** returned, **then** each workstream and the
   program expose `deliveryToBugRatio` and `deliveryToBugRag` per `sub-specs/api-spec.md`.
4. **Given** `bugHours = 0` with delivery > 0, **when** computed, **then** ratio is `null` and
   `deliveryToBugRag` is `Green`; **given** `0/0`, **then** both are `null`.
5. **Given** `includeProgram=false`, **when** requested, **then** the program block (and its ratio)
   is omitted; existing fields are unchanged.

## Implementation Tasks

- [x] Extend `__tests__/lib/metrics/trend-service.test.ts` for window-level sum-then-divide
      aggregation (multi-sprint) including zero-bug and null cases.
- [x] Extend `__tests__/app/api/metrics/route.test.ts` to assert workstream + program
      `deliveryToBugRatio`/`deliveryToBugRag`, the `bugHours` select, and sum-then-divide at program
      level (and `includeProgram=false` omission).
- [x] Add `completedPoints` + `bugHours` to `TrendSnapshotInput` and compute/return
      `deliveryToBugRatio` on `TrendSeriesResult` in `lib/metrics/trend-service.ts`.
- [x] In `app/api/metrics/route.ts`: add `bugHours: true` to the `trendSnapshots` select (keep
      `completedPoints`), hoist `thresholdConfig.findMany()` so it's available outside the program
      branch, and compute per-workstream ratio + RAG via the Story 1 helpers.
- [x] In `route.ts`: compute the program ratio (Σ points ÷ Σ bug hours across in-scope workstreams)
      + RAG, and add both fields to the `program.metrics` payload.
- [x] Add the new optional fields to `lib/dashboard/types.ts` (`ApiWorkstream.prediction`/`metrics`
      and `ApiResponse.program.metrics`).
- [x] Run the trend-service + route test suites; confirm green.

## Technical Notes

- Reuse the `thresholds` rows already fetched for the program block — hoist the query rather than
  fetching twice.
- Choose ONE workstream carrier field (recommend `prediction.deliveryToBugRatio` to mirror
  `prediction.velocityRate`) and keep the adapter read path aligned in Story 3.
- Aggregation must sum numerators and denominators independently, then divide once via
  `calculateDeliveryToBugRatio`.

## Definition of Done

- [x] New + existing trend-service and route tests pass.
- [x] Response matches `sub-specs/api-spec.md` field semantics and behavior matrix.
- [x] No averaging of per-stream/per-sprint ratios anywhere.
- [x] No regression to `velocityRate`, `velocity`, overhead, predictability, carry-over payloads.

## Context for Agents

- **Precedent:** `buildTrendSeries` → `averageVelocityRate` + `prediction` in
  `lib/metrics/trend-service.ts`; program assembly in `app/api/metrics/route.ts` (`aggregateToProgram`,
  `programTrends.averageVelocityRate`).
- **API shape:** sub-specs/api-spec.md (response additions + behavior matrix).
- **Aggregation rule:** spec.md → ## 📐 Calculation → Windowing / Program aggregation.
- **Shadow paths:** technical-spec.md → ## Shadow Paths.

---

## What Was Built

**Implementation Date:** 2026-06-04

### Files Modified

- **`lib/metrics/trend-service.ts`**
  - Extended trend snapshot inputs with completed points and bug hours, returning the window ratio and its summed inputs.
- **`app/api/metrics/route.ts`**
  - Hoisted threshold loading, computed workstream and program delivery-to-bug ratio/RAG fields, and exposed them in the API payload.
- **`lib/dashboard/types.ts`**
  - Added optional delivery-to-bug fields to workstream prediction and program metric response contracts.
- **Story 2 test files**
  - Added trend and route coverage for sum-then-divide, zero-bug RAG, program aggregation, and `bugHours` selection.

### Implementation Decisions

1. **Trend result carries summed inputs** — avoids re-deriving the window in the route and lets RAG distinguish zero-bug delivery from missing data.
2. **Program aggregation reuses `buildTrendSeries` without `workstreamId`** — sums across the in-scope trend snapshots once, matching the existing program trend pattern.

### Test Results

**Verification:** Passed
- `pnpm jest __tests__/lib/metrics/trend-service.test.ts __tests__/app/api/metrics/route.test.ts --runInBand`

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** Clean
- **Boundary Compliance:** Story 2 changes stayed within API, trend-service, dashboard types, and targeted tests.

### Deviations from Spec

None
