# Story 1 — Config schema, migration & seeded defaults

> **Status:** Not Started
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

- [ ] Write seed/schema tests asserting default rows match current constants
- [ ] Add `MetricEngineConfig`, `MetricRuleConfig`, `MetricCategory` enum to `prisma/schema.prisma`
- [ ] Add `MetricEngineConfigInput`, `MetricRuleConfigInput`, `MetricCategory`, `DEFAULT_ENGINE_CONFIG`, default rule constants to `lib/metrics/types.ts`
- [ ] Extend `prisma/seed.ts` with `metricEngineConfigs` (upsert on `key`) and `metricRuleConfigs` (upsert on `[category, workItemType]`)
- [ ] Run `prisma migrate dev --name add_metric_config_tables`
- [ ] Verify seed idempotency (re-run leaves identical rows)

## Technical Notes

See `sub-specs/database-schema.md`. Additive migration only — no backfill. Mirror the
existing `thresholdConfigs` upsert pattern in `seed.ts`.

## Definition of Done

- [ ] Migration applies cleanly; tables + enum present
- [ ] Seed produces defaults matching current hardcoded behavior
- [ ] Types + default constants exported from `lib/metrics/types.ts`
- [ ] Tests pass; ≥80% coverage on new code, 100% on defaults

## Context for Agents

- Pattern to copy: `thresholdConfigs` array + upsert loop in `prisma/seed.ts`.
- Default rule rows are enumerated in `sub-specs/database-schema.md` → "Seeded defaults".
- Overhead per-type hour *formula* stays in `calculateOverhead`; rules only gate inclusion.
