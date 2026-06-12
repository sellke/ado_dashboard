# Story 1 — Centralize Depth Constants and Ingest Nine Sprints

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard maintainer,
**I want** sync to ingest enough sprint history to back every visible tab's rolling window,
**So that** selecting the oldest visible tab shows a complete five-sprint window instead of a
truncated one.

## Acceptance Criteria

1. **Given** a constants module, **when** the code references ingestion depth, **then** it
   resolves to `INGEST_SPRINT_DEPTH = VISIBLE_SPRINT_TABS + ROLLING_WINDOW_DEPTH − 1` (= 9),
   not a bare literal.
2. **Given** `SYNC_CONFIG`, **when** sync runs, **then** `lookbackSprintCount` equals
   `INGEST_SPRINT_DEPTH` (9).
3. **Given** ADO returns ≥ 9 past/current iterations, **when** the rolling selection runs,
   **then** it returns the current sprint plus the 8 most-recent prior sprints, sorted
   descending, with future sprints excluded.
4. **Given** ADO returns fewer than 9 past/current iterations, **when** selection runs,
   **then** it returns all available (truncated, never padded) with no error.

## Implementation Tasks

- [x] Write tests first: `selectRollingSprints(iterations, 9)` returns current + 8 prior,
      descending, future-excluded; truncation cases (5/7 iterations); empty input.
- [x] Add constants module (`lib/sync/window.ts`) with `VISIBLE_SPRINT_TABS`,
      `ROLLING_WINDOW_DEPTH`, `INGEST_SPRINT_DEPTH` (+ a guard test for the formula).
- [x] Point `SYNC_CONFIG.lookbackSprintCount` at `INGEST_SPRINT_DEPTH`.
- [x] Replace the hardcoded `selectRollingFiveSprints(allIterations)` call in the orchestrator
      with depth-parameterized `selectRollingSprints(allIterations, INGEST_SPRINT_DEPTH)`;
      grep all `selectRollingFiveSprints` usages and retire/rename if unused.
- [x] Run the new + existing sync/iterations tests; confirm green.

## Technical Notes

- `selectRollingSprints(iterations, count)` already implements depth, future-exclusion,
  anchoring, and truncation — no new selection logic needed (technical-spec §2.2).
- Distinguish "visible tabs = 5" (unchanged) from "ingestion depth = 5 → 9" when updating
  existing tests.

## Definition of Done

- [x] All acceptance criteria met.
- [x] Constants module + guard test added; config wired to the formula.
- [x] No remaining hardcoded ingestion-depth literal in the sync path.
- [x] Tests green (new + existing sync/iterations).

## Context for Agents

- Implementation map: `spec.md → ## Detailed Requirements → ### Sync Depth`; technical-spec
  §1–§2.
- Files: `lib/sync/window.ts` (new), `lib/sync/config.ts`, `lib/sync/iterations.ts`,
  `lib/sync/orchestrator.ts`.
- Shadow paths: nil/empty iterations, all-future iterations (technical-spec §4).
