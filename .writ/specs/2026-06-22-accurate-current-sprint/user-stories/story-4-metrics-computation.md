# Story 4: Metrics Computation

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** developer maintaining the metric engine,
**I want** snapshot computation to use the shared `resolveCurrentSprint()` resolver instead of a date-range-only check,
**So that** sprint plan capture, velocity projection, carry-over input selection, and velocity RAG gating align with sync and API current-sprint identification — including stale ADO flags and sprint-gap fallbacks.

## Acceptance Criteria

1. [ ] **Given** a sprint row with persisted `isCurrent === true` and valid date range, **when** `computeWorkstreamMetrics` runs for that sprint, **then** `isCurrentSprint` is `true` and sprint plan snapshots are captured (existing current-sprint behavior).
2. [ ] **Given** a sprint with `isCurrent === true` but `endDate < now` (stale flag), **when** `computeWorkstreamMetrics` runs, **then** the resolver ignores the flag, treats the sprint as not current, and skips plan snapshot capture.
3. [ ] **Given** a sprint-gap scenario (no sprint in active date range, most recent past sprint is resolver winner), **when** metrics are computed for that past sprint, **then** `isCurrentSprint` is `true` per resolver rule 3 and plan snapshots are captured.
4. [ ] **Given** a completed past sprint that is not the resolver winner, **when** `computeWorkstreamMetrics` runs, **then** `isCurrentSprint` is `false`, actual velocity is used (not rolling average), velocity RAG is assigned, and carry-over uses plan snapshots when available.
5. [ ] **Given** `computeWorkstreamMetrics` loads a sprint from the DB, **when** the sprint select runs, **then** `isCurrent` is included alongside `id`, `startDate`, and `endDate` so the resolver can evaluate the persisted flag.

## Implementation Tasks

- [ ] **4.1** Update `__tests__/lib/metrics/snapshot.test.ts` first: add cases for stale `isCurrent` flag (no plan capture), gap-sprint current treatment, and completed-sprint non-current behavior using resolver-aligned fixtures.
- [ ] **4.2** Import `resolveCurrentSprint` from `@/lib/sprint/resolve-current` in `lib/metrics/snapshot.ts`.
- [ ] **4.3** Extend the sprint `findUnique` select in `computeWorkstreamMetrics` to include `isCurrent: true`.
- [ ] **4.4** Replace the inline `sprint.startDate <= now && sprint.endDate >= now` check with resolver comparison:
  ```typescript
  const isCurrentSprint =
    resolveCurrentSprint([{ ...sprint, isCurrent: sprint.isCurrent }], now)?.id === sprint.id;
  ```
- [ ] **4.5** Review `lib/metrics/orchestrator.ts` — if it contains independent current-sprint detection (e.g., default `sprintId` fallback or plan-snapshot triggers), adopt the resolver there; otherwise document no change needed in story notes.
- [ ] **4.6** Run focused `snapshot.test.ts` suite and confirm existing current/past sprint metric behavior tests still pass with resolver wiring.
- [ ] **4.7** Verify all acceptance criteria against automated tests before marking complete.

## Technical Notes

- Depends on Story 1 exports in `lib/sprint/resolve-current.ts`; do not duplicate resolver priority logic in `snapshot.ts`.
- `isCurrentSprint` drives three distinct behaviors in `computeWorkstreamMetrics`: (1) sprint plan snapshot capture, (2) carry-over input source (live work items vs plan snapshots), (3) velocity value (rolling avg vs actual) and velocity RAG suppression. All three must flip together based on resolver output.
- Pass a single-sprint array to `resolveCurrentSprint` — the resolver still applies full priority rules; for a lone sprint with stale flag and past dates, it returns that sprint only if it is the most recent past candidate (rule 3).
- Gap-sprint tests should seed multiple sprints in the test DB with `isCurrent` flags matching sync output, then compute metrics for the gap winner.
- `orchestrator.ts` delegates `isCurrent` decisions to `computeWorkstreamMetrics` today; its default `sprintId` fallback (`orderBy: endDate desc`) is out of scope unless a test reveals inconsistent behavior — note finding in story completion if unchanged.
- No changes to calculator, RAG, or rolling-average modules; this story only fixes the current-sprint gate.

## Context for Agents

- **Error map rows:** Stale `isCurrent` in DB — resolver ignores flag, falls back — from `sub-specs/technical-spec.md` → Error & Rescue Map.
- **Shadow paths:** Resolver — stale flag → past fallback; empty input → null — from `sub-specs/technical-spec.md` → Shadow Paths.
- **Business rules:** Resolver priority (ADO flag validated → date range → most recent past → null); stale flag when `endDate < now` — from `spec.md` → Business Rules.
- **Experience:** No new UI — correct velocity projection and plan capture for the true current sprint — from `spec.md` → Experience Design.
- **Traceability:** `sub-specs/technical-spec.md` → Traceability → Story 4 row; Snapshot section for code pattern.
- **Relevant files:** `lib/metrics/snapshot.ts`, `lib/metrics/orchestrator.ts` (review only), `lib/sprint/resolve-current.ts`, `__tests__/lib/metrics/snapshot.test.ts`.

## Definition of Done

- [ ] All implementation tasks completed.
- [ ] All acceptance criteria verified by automated tests.
- [ ] `computeWorkstreamMetrics` uses `resolveCurrentSprint`; no inline date-only current check remains.
- [ ] Sprint DB select includes `isCurrent` for resolver input.
- [ ] Stale-flag and gap-sprint snapshot behavior covered in tests.
- [ ] Focused snapshot test suite passes; no regression in velocity, carry-over, or plan-capture paths.
