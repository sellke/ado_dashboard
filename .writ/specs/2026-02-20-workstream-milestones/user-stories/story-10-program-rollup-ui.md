# Story 10: Program Rollup UI

> **Status:** Completed ✅ (2026-03-09)
> **Priority:** Medium
> **Dependencies:** Story 7
> **Phase:** Phase 2 — ADP Extension (Q4 FY26)

## User Story

**As a** program manager viewing the dashboard
**I want** the quarterly milestone roll-up to be visible in the Program Summary section
**So that** I can see at a glance how many Q4 milestones are complete, in progress, and not started without scrolling through individual workstreams

## Acceptance Criteria

- [x] Given the dashboard loads with milestone data, when `ProgramSummarySection` renders, then it displays the quarterly milestone roll-up (total, complete, in-progress, not-started counts)
- [x] Given `programRollup` data is passed to `ProgramSummarySection`, then the `programRollup` variable is no longer suppressed with `@ts-ignore` or `eslint-disable`
- [x] Given the current month is March 2026, then the program summary shows "March 2026" as the current month with its completion percentage
- [x] Given no milestones exist, then the program summary shows a graceful empty state for the milestone section
- [x] Given milestone data loads but the rest of the dashboard loads independently, then a milestone API failure does not block other dashboard sections

## Implementation Tasks

- [x] 10.1 Write tests for `ProgramSummarySection` rendering quarterly rollup tiles — total, complete, in-progress, not-started, current month %
- [x] 10.2 Remove the `eslint-disable-next-line @typescript-eslint/no-unused-vars` suppression on `programRollup` in `ProgramSummarySection`
- [x] 10.3 Add milestone rollup tiles to `ProgramSummarySection` — quarterly milestone counts (complete / in-progress / not started) and current month completion %
- [x] 10.4 Add empty state handling — if `programRollup` is null or has zero milestones, show "No ADP milestones tracked" placeholder
- [x] 10.5 Verify end-to-end: dashboard loads, program summary shows rollup data from API, no console errors

## Notes

- `programRollup` is already computed by the API and plumbed through `DashboardContainer` → `DashboardShell` → `ProgramSummarySection`. It's just not rendered — the variable is explicitly suppressed with an ESLint disable comment.
- This story removes the suppression and adds actual UI tiles.
- UI design should be consistent with existing Program Summary tiles (Mantine `Paper` + `Text` + `Badge` pattern).
- After Story 8, the quarterly counts will use `Qx` tags. This story should work with whatever `programRollup` shape is provided — it's display-only.
- Can run in parallel with Stories 8 and 9 (all depend on Story 7, not on each other).

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Program rollup data visible on dashboard
