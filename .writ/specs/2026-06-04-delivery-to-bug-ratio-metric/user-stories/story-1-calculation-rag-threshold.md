# Story 1 — Ratio Calculation, RAG, and Seeded Threshold

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

As a **developer building the delivery-to-bug metric**,
I want **a pure ratio calculator, a RAG helper, a seeded threshold, and tooltip copy**,
so that **the metric has a single, tested source of truth for its math and health bands before any wiring**.

## Acceptance Criteria

1. **Given** completed points `P` and bug hours `B > 0`, **when** `calculateDeliveryToBugRatio(P, B)`
   is called, **then** it returns `round(P / B, 2)`.
2. **Given** `bugHours <= 0`, `null`, or `undefined` (or null `completedPoints`), **when** the
   calculator runs, **then** it returns `null` (caller owns the display/RAG decision).
3. **Given** `bugHours = 0` and `completedPoints > 0`, **when** `assignDeliveryToBugRag(...)` runs,
   **then** it returns `Green`; **given** `bugHours = 0` and `completedPoints = 0`, **then** it
   returns `null`.
4. **Given** a finite ratio and the seeded thresholds, **when** RAG is assigned, **then** `≥ 4` →
   Green, `2–3.99` → Amber, `< 2` → Red (boundaries: `4.00` Green, `2.00` Amber, `1.99` Red).
5. **Given** the seed runs (or re-runs), **when** completed, **then** a `deliveryToBugRatio`
   `ThresholdConfig` row exists with the locked bands and no other rows are disturbed.

## Implementation Tasks

- [x] Write unit tests for `calculateDeliveryToBugRatio` (happy path, divide-by-zero, null inputs,
      rounding) in `__tests__/lib/metrics/trend-service.test.ts`.
- [x] Write unit tests for `assignDeliveryToBugRag` (zero-bug Green, 0/0 null, threshold boundaries,
      missing-threshold null) in `__tests__/lib/metrics/rag.test.ts`.
- [x] Implement `calculateDeliveryToBugRatio` in `lib/metrics/trend-service.ts`.
- [x] Implement `assignDeliveryToBugRag` in `lib/metrics/rag.ts`.
- [x] Add the `deliveryToBugRatio` entry to `thresholdConfigs` in `prisma/seed.ts` (match the exact
      field shape of existing entries; confirm against the `ThresholdConfig` model) and extend
      `__tests__/prisma/seed.test.ts`.
- [x] Add `'deliveryToBugRatio'` to the `MetricId` union + a registry entry (definition,
      calculation, ragExplanation) in `lib/metrics/definitions.ts`; extend
      `__tests__/lib/metrics/definitions.test.ts`.
- [x] Run the metrics + seed test suites; confirm green.

## Technical Notes

- Co-locate `calculateDeliveryToBugRatio` with `calculateVelocityRate` in `trend-service.ts`; same
  null/zero-denominator + 2-dp rounding conventions.
- `assignDeliveryToBugRag` delegates to the existing `assignRag` for finite ratios; it only adds the
  zero-bug short-circuit.
- The `greenMax` sentinel (e.g. `999999`) must exceed any realistic ratio so `assignRag`'s
  green-range check works for "higher is better".

## Definition of Done

- [x] All new unit tests pass; existing metrics/seed/definitions tests pass.
- [x] Calculator + RAG handle all rows in the spec's Business Rules table.
- [x] Seeded threshold is idempotent (upsert by `metricName`).
- [x] No Prisma migration introduced.

## Context for Agents

- **Precedent:** `calculateVelocityRate` / `calculateNetCapacityHours` in
  `lib/metrics/trend-service.ts`; `assignRag` / `assignVelocityRag` in `lib/metrics/rag.ts`.
- **Business rules:** spec.md → ## 📋 Business Rules (zero-bug + threshold tables).
- **Error map:** technical-spec.md → ## Error & Rescue Map (rows 1–3).
- **Threshold shape:** `prisma/seed.ts` `thresholdConfigs` (e.g. `overheadPercent`, `carryOverRate`).

---

## What Was Built

**Implementation Date:** 2026-06-04

### Files Modified

- **`lib/metrics/trend-service.ts`**
  - Added `calculateDeliveryToBugRatio`, matching velocity-rate null/zero-denominator and 2-decimal rounding conventions.
- **`lib/metrics/rag.ts`**
  - Added `assignDeliveryToBugRag`, including the zero-bug Green rule before delegating finite values to seeded thresholds.
- **`prisma/seed.ts`**
  - Added the idempotent `deliveryToBugRatio` threshold row with higher-is-healthier bands.
- **`lib/metrics/definitions.ts`**
  - Added `deliveryToBugRatio` to the metric definition registry with tooltip and RAG copy.
- **Story 1 test files**
  - Extended metric, RAG, definition, and seed tests for happy paths, boundaries, null inputs, and idempotency.

### Implementation Decisions

1. **Calculator returns `null` for zero bug hours** — callers own the display/RAG distinction between missing data and healthy zero-bug delivery.
2. **Green sentinel uses `999999`** — matches the existing range-based `assignRag` shape for a higher-is-healthier metric.

### Test Results

**Verification:** Passed
- `pnpm jest __tests__/lib/metrics/trend-service.test.ts __tests__/lib/metrics/rag.test.ts __tests__/lib/metrics/definitions.test.ts --runInBand`
- `pnpm jest __tests__/prisma/seed.test.ts --runInBand`

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** Clean
- **Boundary Compliance:** Story 1 changes stayed within metrics, seed, and targeted test files.

### Deviations from Spec

None
