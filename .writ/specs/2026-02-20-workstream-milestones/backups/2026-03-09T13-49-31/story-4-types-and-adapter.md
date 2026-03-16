# Story 4: Types and Adapter

> **Status:** Completed ✅
> **Priority:** Medium
> **Dependencies:** Story 3

## User Story

**As a** UI component
**I want** typed view models for milestone goals with formatted display values
**So that** components can render milestone data without formatting logic embedded in JSX

## Acceptance Criteria

- [x] Given an `ApiMilestoneProgress` object, when mapped through the adapter, then `MilestoneGoalViewModel` has `percentComplete` formatted as "73%" or "N/A", `adoFeatureId` as "#12345" or null, `targetMonth` as "February 2026", `isCurrentMonth` as true/false ✅
- [x] Given an array of `MilestoneGoalViewModel`, when grouped by month, then `MilestoneMonthGroup[]` is returned with current month first, future months next, past months last ✅
- [x] Given a `MilestoneMonthGroup`, it includes `isCurrentMonth`, `monthLabel`, `milestones`, and `groupCompletionPercent` (formatted "45%") ✅
- [x] Given the `WorkstreamCardViewModel`, when extended, then it includes `milestoneGroups: MilestoneMonthGroup[]` ✅
- [x] Given `mapProgramMilestoneRollup`, when called, then it returns a formatted object suitable for the ProgramSummarySection component ✅

## Implementation Tasks

- [x] 4.1 Write tests for `mapMilestoneToGoalViewModel()` — percent formatting, ADO ID formatting, month label, isCurrentMonth logic ✅
- [x] 4.2 Write tests for `groupMilestonesByMonth()` — correct ordering (current → future → past), group completion calculation ✅
- [x] 4.3 Add new types to `lib/dashboard/types.ts`: `ApiBurnupPoint`, `ApiMilestoneProgress`, `ApiProgramMilestoneRollup`, `MilestoneGoalViewModel`, `MilestoneMonthGroup` ✅
- [x] 4.4 Extend `WorkstreamCardViewModel` in `lib/dashboard/types.ts` to add `milestoneGroups: MilestoneMonthGroup[]` ✅
- [x] 4.5 Add `mapMilestoneToGoalViewModel`, `groupMilestonesByMonth`, `mapProgramMilestoneRollup` to `lib/dashboard/adapter.ts` ✅
- [x] 4.6 Update `mapApiResponseToDashboardViewModel` in `lib/dashboard/adapter.ts` to populate `milestoneGroups` on each `WorkstreamCardViewModel` ✅
- [x] 4.7 Verify: adapter tests pass; `WorkstreamCardViewModel` correctly populated with milestone groups in integration test ✅

## Notes

- Month ordering logic: current month first, then future months ascending, then past months descending (most recent past first)
- `isCurrentMonth`: compare `targetMonth` year+month to today's year+month
- `groupCompletionPercent`: `sum(completedPoints) / sum(totalPoints)` for the group, formatted as "X%" or "N/A" if totalPoints=0
- `adoFeatureId` formatting: `adoFeatureId != null ? '#' + adoFeatureId : null`
- `percentComplete` formatting: `percentComplete != null ? Math.round(percentComplete) + '%' : 'N/A'`
- Milestone data comes from the new `/api/milestones` response — the adapter reads from `DashboardData` which is populated by the dashboard page fetch

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (719/719) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
