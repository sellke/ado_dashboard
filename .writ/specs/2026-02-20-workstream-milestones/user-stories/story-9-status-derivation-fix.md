# Story 9: Milestone Status Derivation Fix

> **Status:** Completed ✅ (2026-03-09)
> **Priority:** Medium
> **Dependencies:** Story 7
> **Phase:** Phase 2 — ADP Extension (Q4 FY26)

## User Story

**As a** dashboard user
**I want** milestone completion status to be derived from actual progress (completedSP/totalSP) at API time
**So that** the status always reflects reality and completed milestones display with the correct visual treatment

## Acceptance Criteria

- [x] Given a milestone with `percentComplete = 100`, when the API returns it, then `status = "Done"` (derived, not from DB)
- [x] Given a milestone with `percentComplete = 50`, when the API returns it, then `status = "InProgress"`
- [x] Given a milestone with `percentComplete = 0` or `null`, when the API returns it, then `status = "NotStarted"`
- [x] Given `FeatureMilestoneCard`, when a milestone has `status === "Done"`, then the card renders with the completed visual style (teal border)
- [x] Given the current codebase where `FeatureMilestoneCard` checks `milestone.status === 'Complete'`, when updated, then it checks `milestone.status === 'Done'` instead

## Implementation Tasks

- [x] 9.1 Write tests for `deriveMilestoneStatus()` integration in the GET handler — verify status is derived from `percentComplete`, not read from DB
- [x] 9.2 Wire `deriveMilestoneStatus()` (already exists in `lib/milestones/calculator.ts`) into the GET handler in `app/api/milestones/route.ts` — override the DB status with derived status
- [x] 9.3 Write test for `FeatureMilestoneCard` — verify completed style applies when `status === 'Done'`
- [x] 9.4 Fix `FeatureMilestoneCard.tsx` — change status check from `'Complete'` to `'Done'`
- [x] 9.5 Verify existing tests still pass with the status derivation change

## Notes

- `deriveMilestoneStatus()` already exists in `lib/milestones/calculator.ts` but is NOT called anywhere in the API route. This story wires it in.
- The `FeatureMilestoneCard` bug: it checks `milestone.status === 'Complete'` but the only valid statuses are `'NotStarted'`, `'InProgress'`, `'Done'`. The teal completed border never renders. Fix: change to `'Done'`.
- This is a small, targeted fix — the function exists, the component exists, they just aren't connected properly.
- Can run in parallel with Stories 8 and 10 (all depend on Story 7, not on each other).

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Completed milestones visually distinguished on the dashboard
