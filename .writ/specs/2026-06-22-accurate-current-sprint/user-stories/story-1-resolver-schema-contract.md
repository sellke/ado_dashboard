# Story 1: Schema + Resolver Contract

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** developer
**I want to** add a persisted `isCurrent` field on `Sprint` and a pure `resolveCurrentSprint()` module with validated priority rules
**So that** sync, API, and metrics layers can share one authoritative current-sprint algorithm without duplicating date-range checks

## Acceptance Criteria

- [ ] **Given** the Prisma `Sprint` model after migration, **when** a row is read, **then** it includes `isCurrent Boolean @default(false)` and existing rows default to `false` until sync writes flags in Story 2.
- [ ] **Given** a sprint list where exactly one candidate has `isCurrent === true` with `startDate <= now <= endDate`, **when** `resolveCurrentSprint(sprints, now)` runs, **then** that sprint is returned.
- [ ] **Given** a sprint with `isCurrent === true` but `endDate < now` (stale flag), **when** the resolver runs, **then** the flag is ignored and resolution falls through to date-range match or most-recent-past fallback per the algorithm in `sub-specs/technical-spec.md`.
- [ ] **Given** overlapping date ranges or multiple valid flagged sprints, **when** the resolver runs, **then** it returns the candidate with the highest `startDate` among valid flagged rows, or among in-range rows when no valid flag wins.
- [ ] **Given** an empty sprint array or no sprint with `startDate <= now`, **when** `resolveCurrentSprint` or `resolveCurrentSprintId` runs, **then** it returns `null`.

## Implementation Tasks

- [ ] 1.1 Write unit tests in `__tests__/lib/sprint/resolve-current.test.ts` — empty input, single valid ADO flag, stale flag rejection, date-range match, overlap (max `startDate`), sprint gap (most recent past), all-future window, and `resolveCurrentSprintId` ID-only wrapper.
- [ ] 1.2 Write unit tests for exported helpers `isSprintActiveByDate` and `isAdoCurrentFlagValid` — boundary dates (`startDate`, `endDate`), stale flag when `endDate < now`, and injectable `now` for determinism.
- [ ] 1.3 Add `isCurrent Boolean @default(false)` to the `Sprint` model in `prisma/schema.prisma` and run `pnpm prisma migrate dev --name add-sprint-is-current`.
- [ ] 1.4 Create `lib/sprint/resolve-current.ts` with `SprintCurrentInput`, `resolveCurrentSprint`, `resolveCurrentSprintId`, `isSprintActiveByDate`, and `isAdoCurrentFlagValid` — pure functions with no DB or ADO imports.
- [ ] 1.5 Implement the full resolution algorithm from `sub-specs/technical-spec.md` → `### Resolution Algorithm` (filter `startDate <= now`; validated flag → in-range → most recent past → null).
- [ ] 1.6 Run focused test coverage for the new module (`pnpm jest __tests__/lib/sprint/resolve-current.test.ts --runInBand`).
- [ ] 1.7 Verify all acceptance criteria are met; confirm no changes to `lib/sync/iterations.ts`, API routes, or snapshot code in this story.

## Technical Notes

- Resolver is a pure function module — no Prisma client, no ADO client, no `next/headers`. Consumers in Stories 2–4 import it at read/write boundaries.
- Schema backfill is deferred to the next sync (Story 2); no manual data migration script. Existing rows remain `isCurrent = false` until then.
- Step 1 of the algorithm rejects stale flags (`endDate < now`) before step 2 date-range matching — see `sub-specs/technical-spec.md` → `### Resolution Algorithm`.
- `resolveCurrentSprintId` requires `{ id: string } & SprintCurrentInput`; return `resolveCurrentSprint(...)?.id ?? null`.
- Timezone handling stays as today: instant `Date` comparison on stored UTC timestamps from ADO — no calendar-day normalization in this story.
- Do **not** wire sync (`upsertSprintsFromIterations`, `selectRollingSprints`), `/api/metrics`, `/api/sprints/stories`, or `lib/metrics/snapshot.ts` — those are Stories 2–4.

## Context for Agents

- **Resolution algorithm:** [Filter candidates, Valid ADO flag, Date-range match, Gap / past fallback, Null input] — from `sub-specs/technical-spec.md` → `### Resolution Algorithm`
- **Error map rows:** [Prisma migration, resolveCurrentSprint empty input, Stale isCurrent in DB] — from `sub-specs/technical-spec.md` → Error & Rescue Map
- **Shadow paths:** [Resolver happy path, Nil input, Empty input after future filter] — from `sub-specs/technical-spec.md` → Shadow Paths → Resolver row
- **Business rules:** [Resolver priority (ADO flag validated → date range → gap/past → null), Timezone (instant Date), Sync write rule deferred to Story 2] — from `spec.md` → Business Rules
- **Edge cases:** [Multiple ADO isCurrent flags, Overlapping date ranges, Sprint gap, Stale flag after sprint end, Pre-migration rows isCurrent=false] — from `sub-specs/technical-spec.md` → Interaction Edge Cases
- See `spec.md` → `## Detailed Requirements` → `### Schema` and `### Resolver Module` for module API expectations.
- See `sub-specs/technical-spec.md` → `## Schema Change` and `## Resolver API` for field names, types, and function signatures.
- Relevant files: `prisma/schema.prisma` (schema), `lib/sprint/resolve-current.ts` (new), `__tests__/lib/sprint/resolve-current.test.ts` (new). Out of scope: `lib/sync/iterations.ts`, `app/api/metrics/route.ts`, `lib/metrics/snapshot.ts`.

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All acceptance criteria met
- [ ] Prisma migration applied locally; `isCurrent` column present on `Sprint`
- [ ] `resolve-current.test.ts` passing with coverage for all priority rules and edge cases listed in the technical spec
- [ ] No sync, API, or snapshot wiring (Stories 2–4)
- [ ] Resolver module documented via exported types and function names consistent with `sub-specs/technical-spec.md`
