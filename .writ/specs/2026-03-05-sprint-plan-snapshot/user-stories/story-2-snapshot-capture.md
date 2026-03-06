# Story 2: Snapshot Capture in Metric Computation

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** sync pipeline
**I want to** automatically capture work item snapshots for the current sprint during each metric computation
**So that** the last snapshot before sprint close becomes the definitive record for carry-over calculations

## Acceptance Criteria

- [ ] Given a current (in-progress) sprint, when `computeWorkstreamMetrics()` runs, then `SprintPlanSnapshot` rows are upserted for all work items in that sprint+workstream
- [ ] Given a completed sprint, when `computeWorkstreamMetrics()` runs, then no snapshot rows are written or updated (existing snapshots are preserved)
- [ ] Given a work item with `storyPoints: 5, state: "Active", type: "Story"`, when the snapshot captures it, then the row stores those exact values
- [ ] Given a snapshot capture failure, when an error occurs, then metric computation continues (snapshot is non-fatal)
- [ ] Given an item that existed in a prior snapshot but no longer appears in the sprint's work items, when snapshot capture runs, then the stale row is deleted (item was moved out of the sprint)

## Implementation Tasks

- [ ] 2.1 Write tests for snapshot capture: (a) upserts rows for current sprint, (b) skips completed sprints, (c) records correct storyPoints/state/type, (d) is non-fatal on error, (e) removes stale rows for items no longer in the sprint
- [ ] 2.2 In `lib/metrics/snapshot.ts` → `computeWorkstreamMetrics()`, after fetching work items (line ~69), add snapshot capture logic gated by `isCurrentSprint`: upsert a `SprintPlanSnapshot` row per work item, then delete rows for `adoId`s no longer present
- [ ] 2.3 Wrap snapshot capture in try/catch to ensure it's non-fatal — log errors but don't throw
- [ ] 2.4 Verify end-to-end: run sync, confirm snapshot rows appear for current sprint workstreams, confirm completed sprint snapshots are untouched
- [ ] 2.5 Verify stale cleanup: if an item is removed from a sprint between syncs, confirm its snapshot row is deleted

## Notes

- The snapshot upsert uses the `@@unique([sprintId, workstreamId, adoId])` constraint for idempotent writes.
- Stale row cleanup: after upserting current items, delete any `SprintPlanSnapshot` rows for this sprint+workstream where `adoId NOT IN (current work item adoIds)`. This handles items that ADO moved mid-sprint.
- Performance: batch upserts using `prisma.$transaction()` to minimize round-trips. Typical workstream has 10-40 items, so this is lightweight.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Snapshot rows verified in database after sync
- [ ] Completed sprint snapshots unaffected by subsequent syncs
