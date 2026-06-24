# Story 2: Sync Persistence

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard maintainer
**I want to** persist ADO's current-sprint flag during iteration sync and resolve the rolling-window anchor with the same shared resolver
**So that** `Sprint` rows in the database carry an authoritative `isCurrent` value and sync no longer returns a `currentSprint` that disagrees with the window anchor

## Acceptance Criteria

- [ ] **Given** Story 1's `resolveCurrentSprint()` and the `Sprint.isCurrent` schema field exist, **when** `upsertSprintsFromIterations` runs over a set of ADO iterations, **then** exactly one ingested sprint row has `isCurrent = true` (the resolver winner) and all other ingested rows have `isCurrent = false`.
- [ ] **Given** an existing sprint row is updated during upsert, **when** the iteration is not the resolved current sprint, **then** `isCurrent` is written as `false` even if a stale `true` was stored from a prior sync.
- [ ] **Given** a newly created sprint row during upsert, **when** the iteration matches the resolver winner, **then** `isCurrent = true` is persisted alongside name and dates.
- [ ] **Given** `selectRollingSprints` receives past/current iterations, **when** it selects the rolling window, **then** `currentIdx` and returned `currentSprint` both derive from `resolveCurrentSprint()` — not independent flag/date/last-sprint logic.
- [ ] **Given** the anchor sprint resolved by the shared function, **when** `selectRollingSprints` returns, **then** `currentSprint` equals that resolved sprint (same path), eliminating the line-75 inconsistency where anchor used resolver-style logic but `currentSprint` re-searched `selected.find(isCurrent)`.
- [ ] **Given** `syncIterations` completes, **when** downstream consumers read `currentSprintId` / `currentSprintPath`, **then** those values correspond to the resolver winner's path in the upserted set.
- [ ] **Given** no past/current iterations (empty or all future), **when** sync selection runs, **then** behavior is unchanged: empty sprints, null current, no upsert writes.

## Implementation Tasks

- [ ] 2.1 Extend `__tests__/lib/sync/iterations.test.ts` first — add cases for `isCurrent` persistence on create/update, clearing non-winners, resolver-winner alignment, and `currentSprint` matching anchor when ADO flag and date-range disagree within the selected window.
- [ ] 2.2 Import `resolveCurrentSprint` from `@/lib/sprint/resolve-current` in `lib/sync/iterations.ts`; map `AdoIterationInput.finishDate` to resolver `endDate` at the call site (resolver uses `endDate`; ADO type uses `finishDate`).
- [ ] 2.3 Refactor `selectRollingSprints`: replace inline current-index logic (lines 61–67) with `resolveCurrentSprint(sorted, now)`; derive `currentIdx` from the resolved sprint; return `{ sprints, currentSprint: current }` where `current` is the resolver output (not a separate `selected.find` pass).
- [ ] 2.4 Update `upsertSprintsFromIterations`: before the upsert loop, resolve current iteration via `resolveCurrentSprint(iterations, new Date())`; on each create/update, persist `isCurrent: it.path === currentIteration?.path`; derive `currentSprintId` from the resolved path (assert or prefer resolver path over the `currentPath` param — param may remain for backward compatibility but must match resolver output when both are provided).
- [ ] 2.5 Ensure `syncIterations` continues to pass `currentSprint?.path` into upsert; verify end-to-end that returned `currentSprintId` matches the row with `isCurrent = true` in the database after sync.
- [ ] 2.6 Run focused sync tests: `pnpm jest __tests__/lib/sync/iterations.test.ts --runInBand`; confirm existing rolling-window and upsert tests still pass with updated expectations where resolver behavior differs from legacy inline logic.
- [ ] 2.7 Verify all acceptance criteria are met; do not wire API routes, snapshot, or dashboard (Stories 3–5).

## Technical Notes

- Depends on Story 1 delivering `lib/sprint/resolve-current.ts` and the Prisma `Sprint.isCurrent` migration — do not duplicate resolver logic in the sync module.
- Sync write rule (from spec): set `isCurrent = true` only on the resolver winner among ingested iterations; all other rows in the upsert batch get `isCurrent = false`. Only ingested sprints are updated — no global "clear all sprints in DB" sweep required unless existing tests expect it.
- The known bug: `selectRollingSprints` anchors the window using flag → date → last-sprint logic, but line 75 sets `currentSprint = selected.find(isCurrent) ?? selected[last]`, which can pick a different sprint when the anchor used date-range or last-sprint fallback. Delegating both to `resolveCurrentSprint` fixes this.
- `upsertSprintsFromIterations` today writes only `name`, `startDate`, `endDate` — Story 2 adds `isCurrent` to both create and update `data` payloads.
- ADO `isCurrent` mapping in `lib/sync/ado-client.ts` is unchanged; this story consumes it through iteration inputs passed to the resolver.
- Pre-migration rows default `isCurrent = false` until the next sync; that backfill behavior is acceptable and out of scope for manual migration scripts.

## Context for Agents

- **Error map rows:** [Sync upsert isCurrent, resolveCurrentSprint empty input] — from `sub-specs/technical-spec.md` → Error & Rescue Map
- **Shadow paths:** [Sync persist happy path, Sync persist no iterations, Resolver empty input] — from `sub-specs/technical-spec.md` → Shadow Paths
- **Business rules:** [Resolver priority (flag validated → date-range → most recent past → null), Sync write rule (one winner, clear others in ingested set), Timezone (instant Date comparison on stored UTC timestamps)] — from `spec.md` → Business Rules
- **Experience:** [No new UI — correct persistence is the deliverable; stale ADO flag at sync time handled by resolver fallbacks silently]
- See `spec.md` → `## Detailed Requirements` → `### Sync Persistence` and `### selectRollingSprints` refactor notes.
- See `sub-specs/technical-spec.md` → `## Sync Changes` for pseudocode (`currentPathResolved`, upsert `data.isCurrent`, `selectRollingSprints` return shape).
- **Relevant files:** `lib/sync/iterations.ts` (primary), `__tests__/lib/sync/iterations.test.ts` (tests). **Do not modify:** `app/api/metrics/route.ts`, `lib/metrics/snapshot.ts`, dashboard components (Stories 3–5).
- **Story 1 outputs required:** `resolveCurrentSprint`, `resolveCurrentSprintId`, `SprintCurrentInput`, Prisma `isCurrent` field on `Sprint`.

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All acceptance criteria met
- [ ] `selectRollingSprints` uses shared resolver; `currentSprint` matches anchor
- [ ] `upsertSprintsFromIterations` persists `isCurrent` on create and update
- [ ] `__tests__/lib/sync/iterations.test.ts` extended and passing; no regressions in existing sync selection tests
- [ ] No API, snapshot, or dashboard wiring (Stories 3–5 remain independent)
- [ ] Story 3 can read persisted `isCurrent` from DB without rework of sync write paths
