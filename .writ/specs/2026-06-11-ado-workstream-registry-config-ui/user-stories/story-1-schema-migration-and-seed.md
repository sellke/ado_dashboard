# Story 1 — Schema, migration & seeded defaults

> **Status:** Not Started
> **Priority:** High (foundation)
> **Dependencies:** None

## User Story

As a **platform maintainer**, I want **workstream and program sync settings stored in the
database with defaults matching today's hardcoded config**, so that **later stories can drive
sync and UI from DB rows without changing behavior on first deploy**.

## Acceptance Criteria

1. **Given** a fresh migration, **when** I inspect the schema, **then** `Workstream` has
   `adoOrg`, `adoProject`, `adoTeamId`, `syncEnabled` and `SyncProgramConfig` exists.
2. **Given** seed runs, **when** I query config, **then** five workstreams match
   `SYNC_CONFIG.workstreams` (name, teamId, area path) and program config matches
   `SYNC_CONFIG` project/iteration/lookback values.
3. **Given** existing workstream rows from prior seed, **when** migration backfills, **then**
   new columns are populated without data loss.

## Implementation Tasks

- [ ] Write schema/seed tests asserting default rows match `SYNC_CONFIG` constants
- [ ] Extend `Workstream` model in `prisma/schema.prisma`
- [ ] Add `SyncProgramConfig` singleton model
- [ ] Create migration `add_workstream_registry_fields`
- [ ] Extend `prisma/seed.ts` with program config + workstream field upserts
- [ ] Add `SyncProgramConfigInput` / loader types in `lib/sync/types.ts` or dedicated module
- [ ] Verify seed idempotency (re-run leaves identical rows)

## Technical Notes

See `sub-specs/database-schema.md`. Preserve existing `workstreams` seed names for dashboard
default compatibility. `adoOrg` seed reads `process.env.ADO_ORG` with documented fallback.

## Definition of Done

- [ ] Migration applies cleanly on dev DB
- [ ] Seed produces rows matching current hardcoded sync targets
- [ ] Tests pass; ≥80% coverage on new seed/migration helpers

## Context for Agents

- Copy pattern: `thresholdConfigs` upsert loop in `prisma/seed.ts`.
- Current constants: `lib/sync/config.ts` and `buildAdoAreaPath()` in `orchestrator.ts`.
- Do not remove `SYNC_CONFIG.workstreams` until Story 5 — Story 1 only adds DB storage.
