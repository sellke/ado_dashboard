# Story 2 — Config-driven engine refactor

> **Status:** Not Started
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

- [ ] Capture a regression fixture of current engine output (pre-refactor) for equality tests
- [ ] Add `lib/metrics/config-rules.ts` (`isIncluded` helper) + tests
- [ ] Add `lib/metrics/config-loader.ts` (`loadMetricConfig`) with default fallback + tests
- [ ] Refactor `calculateVelocity`/`calculatePredictability`/`calculateCarryOver` to accept rules (default = current exclusion)
- [ ] Refactor `assignVelocityRag` to accept cutoff ratios (default `1.0`/`0.7`)
- [ ] Thread `rollingWindow` into the prior-snapshot `take` in `snapshot.ts`; load + pass config in `snapshot.ts`/`orchestrator.ts`
- [ ] Verify regression equality test passes with defaults

## Technical Notes

See `sub-specs/technical-spec.md` → "Refactors". Config is passed *into* pure functions;
DB read stays at orchestration layer. Default constants are the zero-drift guarantee.

## Definition of Done

- [ ] All hardcoded constants (`!=='Bug'/'Spike'`, `1.0`, `0.7`, `take: 4`) sourced from config
- [ ] Regression equality test green with default config
- [ ] Existing metric tests still pass
- [ ] ≥80% coverage new code; 100% on config-rules + loader

## Context for Agents

- Hardcoded sites: `calculators.ts` lines ~27/104/137 (`!=='Bug' && !=='Spike'`),
  `rag.ts` `assignVelocityRag` (`1.0`/`0.7`), `snapshot.ts` (`take: 4`, line ~169).
- `assignRag` already reads `ThresholdConfigInput[]` — no change needed there.
- Edge case to cover: all types excluded for a category → 0/null, no crash.
