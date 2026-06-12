# Story 2 — Verify and Guard Downstream Coverage of the Deeper Window

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard maintainer,
**I want** work items, capacity, and metric snapshots to be ingested/recomputed for all nine
sprints,
**So that** the oldest visible tab's window has fresh, complete data — not just sprint rows.

## Acceptance Criteria

1. **Given** depth = 9 and ≥ 9 iterations, **when** a Full sync runs, **then** work-item sync
   receives all 9 sprint paths (via `sprintIdMap`) and capacity sync covers all 9 iterations.
2. **Given** the same sync, **when** metric computation runs, **then** `computeAllMetrics` is
   invoked once per ingested sprint (9 total), in oldest → newest order.
3. **Given** the read paths, **when** they query the DB, **then** `/api/sprints/stories`
   still returns 5 tabs and `/api/metrics` anchored window returns up to 5 sprints — backed by
   the now-present data.
4. **Given** an iteration-fetch failure, **when** sync runs, **then** the failure is recorded
   and other workstream phases remain isolated (existing behavior preserved).

## Implementation Tasks

- [x] Write tests first: orchestrator builds a 9-entry `sprintIdMap`; `computeAllMetrics`
      called for all 9 sprints oldest → newest; failure isolation preserved.
- [x] Confirm no orchestrator logic change is required; if a phase silently caps at 5, fix it
      to follow the selected set.
- [x] (Recommended) Replace the `take: 5` literals in `app/api/sprints/stories/route.ts` and
      the `/api/metrics` anchored window with `VISIBLE_SPRINT_TABS` / `ROLLING_WINDOW_DEPTH`
      for self-documentation.
- [x] Verify current-sprint default view is unchanged (response shape + projection behavior).
- [x] Run focused orchestrator coverage + metrics-route tests; confirm green. Full
      `sync-ado` endpoint file still has two existing real-sync success expectations that fail
      outside the isolated orchestrator test.

## Technical Notes

- Coverage cascades from the selected set (technical-spec §2.3 table). This story is mostly
  verification + guards, with route constant adoption optional but recommended.
- Preserve the oldest → newest recompute order so current-sprint projections read prior
  snapshots.

## Definition of Done

- [x] All acceptance criteria met.
- [x] Downstream coverage of 9 sprints asserted by tests.
- [x] Current-sprint behavior verified unchanged.
- [x] Tests green (orchestrator + metrics route).

## Context for Agents

- Implementation map: `spec.md → ## Detailed Requirements → ### Downstream Coverage
  Verification` and `### Read Paths`; technical-spec §2.3, §3.
- Files: `lib/sync/orchestrator.ts`, `app/api/sprints/stories/route.ts`,
  `app/api/metrics/route.ts`.
- Error map: iteration-fetch failure isolation (technical-spec §4).
