# Story 1 — Config schema, migration & seeded defaults

> **Status:** Completed ✅
> **Completed:** 2026-06-12
> **Priority:** High (foundation)
> **Dependencies:** None

## User Story

As a **platform maintainer**, I want **the configurable metric parameters backed by
database tables seeded with today's exact values**, so that **later stories can read
config instead of hardcoded constants without changing any metric output**.

## Acceptance Criteria

1. **Given** a fresh migration, **when** I inspect the schema, **then** `MetricEngineConfig`
   (singleton) and `MetricRuleConfig` (per category × type) tables exist, and
   `ThresholdConfig` is unchanged.
2. **Given** the seed runs, **when** I query the config, **then** `MetricEngineConfig` has
   `velocityGreenFloor=1.0`, `velocityAmberFloor=0.7`, `rollingWindow=4`, and
   `MetricRuleConfig` excludes Bug/Spike from `deliveryPoints` and includes Bug/Spike/Support
   in `overheadHours`.
3. **Given** the new config types, **when** code imports `DEFAULT_ENGINE_CONFIG` and the
   default rule helpers, **then** they encode current behavior.

## Implementation Tasks

- [x] Write seed/schema tests asserting default rows match current constants
- [x] Add `MetricEngineConfig`, `MetricRuleConfig`, `MetricCategory` enum to `prisma/schema.prisma`
- [x] Add `MetricEngineConfigInput`, `MetricRuleConfigInput`, `MetricCategory`, `DEFAULT_ENGINE_CONFIG`, default rule constants to `lib/metrics/types.ts`
- [x] Extend `prisma/seed.ts` with `metricEngineConfigs` (upsert on `key`) and `metricRuleConfigs` (upsert on `[category, workItemType]`)
- [x] Create and apply additive migration for metric config tables
- [x] Verify seed idempotency (re-run leaves identical rows)

## Technical Notes

See `sub-specs/database-schema.md`. Additive migration only — no backfill. Mirror the
existing `thresholdConfigs` upsert pattern in `seed.ts`.

## Definition of Done

- [x] Migration applies cleanly; tables + enum present
- [x] Seed produces defaults matching current hardcoded behavior
- [x] Types + default constants exported from `lib/metrics/types.ts`
- [x] Tests pass; ≥80% coverage on new code, 100% on defaults

## Context for Agents

- Pattern to copy: `thresholdConfigs` array + upsert loop in `prisma/seed.ts`.
- Default rule rows are enumerated in `sub-specs/database-schema.md` → "Seeded defaults".
- Overhead per-type hour *formula* stays in `calculateOverhead`; rules only gate inclusion.

---

## What Was Built

**Implementation Date:** 2026-06-12

### Files Created

1. **`prisma/migrations/20260612161000_add_metric_config_tables/migration.sql`**
   - Adds the `MetricCategory` enum plus `metric_engine_config` and `metric_rule_config` tables with required unique indexes.

### Files Modified

- **`prisma/schema.prisma`**
  - Added `MetricCategory`, `MetricEngineConfig`, and `MetricRuleConfig` while leaving `ThresholdConfig` unchanged.
- **`lib/metrics/types.ts`**
  - Added metric engine config inputs, metric rule config inputs, singleton/default constants, and the default inclusion matrix.
- **`prisma/seed.ts`**
  - Added idempotent upserts for the singleton engine config and category/type rule configs.
- **`__tests__/prisma/helpers.ts`**
  - Added cleanup for metric config tables.
- **`__tests__/prisma/seed.test.ts`**
  - Added seed assertions for engine defaults, rule matrix defaults, and idempotency counts.

### Implementation Decisions

1. **Preserved current delivery-point behavior** — `Support`, `Epic`, `Feature`, `Task`, and `UserStory` are included in `deliveryPoints`; only `Bug` and `Spike` are excluded, matching the existing hardcoded `type !== 'Bug' && type !== 'Spike'` behavior.
2. **Kept overhead formulas out of config** — rule rows only control inclusion; per-type hour sourcing remains in calculator code for Story 2.

### Test Results

**Verification:** `pnpm exec jest __tests__/prisma/seed.test.ts --runInBand`
- ✅ 15/15 focused seed tests passing
- ✅ `pnpm exec prisma generate` succeeded
- ⚠️ `pnpm run typecheck` is blocked by pre-existing errors in `app/api/metrics/route.ts` and `lib/sync/ado-client.ts` outside the Story 1 edit surface

### Review Outcome

**Result:** PASS after fix

- **Iteration count:** 1 review iteration
- **Drift:** Small/intentional conflict resolution in favor of the top-level zero-drift contract
- **Security:** Not assessed as security-sensitive
- **Boundary Compliance:** Story 1 edits stayed within schema, seed, metric types, migration, and seed-test files

### Deviations from Spec

- **Support delivery-point default** — The database sub-spec table listed `Support` as excluded for `deliveryPoints`, but the top-level spec and existing code require only `Bug` and `Spike` to be excluded. Implementation follows the zero-drift contract.
