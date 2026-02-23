# Story 2: Progress Calculator

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard system
**I want** to compute completed vs. total story points per ADO Feature milestone, grouped by sprint for burnup visualization
**So that** the UI can display accurate progress and a burnup chart for each monthly goal

## Acceptance Criteria

- [x] Given a Feature with 3 child UserStories (10SP done, 5SP in-progress, 5SP not-started), when `computeMilestoneProgress` runs, then `completedSP=10`, `totalSP=20`, `percentComplete=50` ✅
- [x] Given a Feature with no child UserStories, when `computeMilestoneProgress` runs, then `totalSP=0`, `completedSP=0`, `percentComplete=null` ✅
- [x] Given child stories spread across 3 sprints, when `computeMilestoneProgress` runs, then `burnupData` has 3 entries with correct cumulative completed SP per sprint ✅
- [x] Given the program roll-up function, when called with current-month milestones, then returns correct `currentMonthCompletionPercent`, `quarterlyMilestones.total/complete/inProgress/notStarted` ✅
- [x] Given all child stories are done (100%), when status is derived, then `MilestoneStatus = Done` ✅

## Implementation Tasks

- [x] 2.1 Write tests for `computeMilestoneProgress()` — happy path, no children, partial completion, burnup ordering ✅
- [x] 2.2 Write tests for `deriveMilestoneStatus()` — 0% → NotStarted, 1-99% → InProgress, 100% → Done ✅
- [x] 2.3 Write tests for `computeProgramMilestoneRollup()` — current month filter, quarterly counts ✅
- [x] 2.4 Create `lib/milestones/calculator.ts` implementing `computeMilestoneProgress`, `deriveMilestoneStatus`, `computeProgramMilestoneRollup` ✅
- [x] 2.5 Export `MilestoneProgress`, `BurnupDataPoint`, `ProgramMilestoneRollup` types from `lib/milestones/calculator.ts` ✅
- [x] 2.6 Verify: unit tests cover all edge cases; function is callable from the API route ✅

## Notes

- Done-like states for UserStory: `'Done'`, `'Closed'`, `'Resolved'` — treat all three as completed
- Burnup data: order sprints by `sprint.startDate` ascending, then cumulate completed SP
- Burnup shows sprints that have at least one child story (skip empty sprints from the data)
- `ProgramMilestoneRollup` interface:
  ```typescript
  interface ProgramMilestoneRollup {
    currentMonth: string;               // "February 2026"
    currentMonthCompletionPercent: number | null;
    currentMonthTotalSP: number;
    currentMonthCompletedSP: number;
    quarterlyMilestones: {
      total: number;
      complete: number;      // percentComplete === 100
      inProgress: number;    // 0 < percentComplete < 100
      notStarted: number;    // percentComplete === 0 or null
    };
  }
  ```
- Quarter = current fiscal quarter (Q4 FY26 = Jan-Mar 2026); use calendar quarter if fiscal quarter not configured
- Pure functions only — no Prisma imports in this file

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (40/40) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
