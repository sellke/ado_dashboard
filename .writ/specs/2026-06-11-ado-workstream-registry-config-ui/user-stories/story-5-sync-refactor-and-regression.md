# Story 5 — Sync refactor & regression

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Stories 1 and 3

## User Story

As a **maintainer**, I want **sync to read workstreams and program config from the database**,
so that **registry UI changes drive Sync Now without code deploys — with proof defaults didn't drift**.

## Acceptance Criteria

1. **Given** seeded default registry, **when** sync runs, **then** the same five workstreams are
   processed with the same area paths and team IDs as pre-feature `SYNC_CONFIG`.
2. **Given** `syncEnabled: false`, **when** sync runs, **then** that workstream is skipped.
3. **Given** a newly added workstream in DB, **when** sync runs, **then** it is included without
   code changes.
4. **Given** refactor complete, **when** I search the codebase, **then** `SYNC_CONFIG.workstreams`
   array is removed.

## Implementation Tasks

- [ ] Add `lib/sync/sync-config-loader.ts` + unit tests
- [ ] Refactor `orchestrator.ts` to load program config + enabled workstreams from DB
- [ ] Update `capacity.ts` and other sync modules using `SYNC_CONFIG` project/team constants
- [ ] Remove hardcoded `workstreams` from `lib/sync/config.ts`; keep env-only fallbacks if needed
- [ ] Add integration test: default DB → sync targets match SYNC_CONFIG fixture
- [ ] Run full sync test suite; fix regressions
- [ ] Update `ensureConfiguredWorkstreams` to no-op or merge into seed-only path

## Technical Notes

See `sub-specs/technical-spec.md` → Orchestrator refactor. Highest-value test: compare sync
target list (name, teamId, areaPath) before/after against captured fixture.

## Definition of Done

- [ ] Sync fully DB-driven; hardcoded workstream array gone
- [ ] Regression test green on default seed
- [ ] Existing sync tests updated and passing

## Context for Agents

- Current entry: `ensureConfiguredWorkstreams()` + `SYNC_CONFIG` in `orchestrator.ts`.
- Iteration fetch still uses umbrella `iterationTeamId` from program config.
- Per-workstream capacity uses each row's `adoTeamId` + program's `adoProject`.
