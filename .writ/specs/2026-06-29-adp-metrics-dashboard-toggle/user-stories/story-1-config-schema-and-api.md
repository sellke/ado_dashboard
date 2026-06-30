# Story 1: Config Schema and Rules API

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** developer
**I want to** persist `includeAdpMetrics` on the program-wide metric engine config and expose it through the existing metric config API
**So that** the dashboard and export layers can read a single DB-backed ADP visibility flag with a safe default of included

## Acceptance Criteria

- [ ] **Given** a fresh seeded database, **when** `GET /api/metric-config` is called, **then** `engine.includeAdpMetrics` is `true`.
- [ ] **Given** a valid rules payload with `includeAdpMetrics: false`, **when** `PUT /api/metric-config/rules` succeeds, **then** the DB row is updated and the response includes `includeAdpMetrics: false`.
- [ ] **Given** a rules payload where `includeAdpMetrics` is a non-boolean, **when** PUT is called, **then** the API returns 422 with a field error.
- [ ] **Given** no `MetricEngineConfig` row exists, **when** `loadMetricConfig()` runs, **then** `engine.includeAdpMetrics` defaults to `true`.
- [ ] **Given** a rules payload without `includeAdpMetrics`, **when** PUT succeeds, **then** the existing engine flag is unchanged.

## Implementation Tasks

- [ ] 1.1 Write API tests for GET/PUT covering default, persist false, validation error, and omit-field unchanged behavior.
- [ ] 1.2 Add `includeAdpMetrics Boolean @default(true)` to `MetricEngineConfig` in `prisma/schema.prisma` and generate migration.
- [ ] 1.3 Extend `MetricEngineConfigInput`, `DEFAULT_ENGINE_CONFIG`, and `loadMetricConfig()` merge logic in `lib/metrics/types.ts` and `lib/metrics/config-loader.ts`.
- [ ] 1.4 Add `isAdpMetricsIncluded()` helper (new module or `config-rules.ts`) defaulting to true when absent.
- [ ] 1.5 Extend `PUT /api/metric-config/rules` to accept optional `includeAdpMetrics` and upsert engine config in the same transaction.
- [ ] 1.6 Update `prisma/seed.ts` to set `includeAdpMetrics: true` on engine upsert.
- [ ] 1.7 Run focused tests and verify acceptance criteria.

## Technical Notes

- Prefer extending rules PUT over engine PUT so Inclusion Rules tab owns one save action (Story 2).
- Transaction must include all rule upserts plus optional engine update — partial failure rolls back.
- Do not wire UI or dashboard in this story.

## Context for Agents

- **Error map:** [Save rules + includeAdpMetrics validation], [Save rules + includeAdpMetrics DB failure] — `sub-specs/technical-spec.md` → Error & Rescue Map
- **Shadow paths:** [Save ADP off], [Dashboard load nil engine row] — `sub-specs/technical-spec.md` → Shadow Paths
- **Business rules:** Default true; program-wide singleton — `spec.md` → Business Rules
- **API contract:** `sub-specs/api-spec.md`
- **Schema:** `sub-specs/database-schema.md`
- **Files:** `prisma/schema.prisma`, `prisma/seed.ts`, `lib/metrics/types.ts`, `lib/metrics/config-loader.ts`, `app/api/metric-config/rules/route.ts`, `__tests__/app/api/metric-config/`

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All acceptance criteria met
- [ ] Migration applies cleanly; seed sets default
- [ ] API tests passing
- [ ] No UI or dashboard wiring (Stories 2–3)
