# Story 8: Quarter Tag Parsing & Rollup

> **Status:** Completed ✅ (2026-03-09)
> **Priority:** High
> **Dependencies:** Story 7
> **Phase:** Phase 2 — ADP Extension (Q4 FY26)

## User Story

**As a** program manager
**I want** the system to parse `Qx` quarter tags (e.g., `Q4`) on ADO Features and use them for quarterly milestone roll-up
**So that** the quarterly progress view groups milestones by their explicit ADP quarter assignment rather than inferring quarter from month

## Acceptance Criteria

- [x] Given an ADO Feature with tags `ADP-MAR; Q4`, when sync runs, then the Milestone record includes `quarter: "Q4"`
- [x] Given an ADO Feature with tag `ADP-MAR` but no `Qx` tag, when sync runs, then the Milestone record has `quarter: null`
- [x] Given milestones with `Q4` quarter tags, when `computeProgramMilestoneRollup()` runs, then quarterly counts group by the `Qx` tag value instead of inferring quarter from `targetMonth`
- [x] Given milestones without a `Qx` tag, when computing quarterly roll-up, then they are excluded from quarterly counts
- [x] Given `parseQuarterTag()` with values `Q1`, `Q2`, `Q3`, `Q4`, then all parse correctly (case-insensitive)
- [x] Given `parseQuarterTag()` with values `Q5`, `Q`, `Quarter4`, `q4-fy26`, then all return null

## Implementation Tasks

- [x] 8.1 Write tests for `parseQuarterTag()` — `Q4` → "Q4", `q1` → "Q1", `Q5` → null, `Quarter4` → null
- [x] 8.2 Implement `parseQuarterTag()` in `lib/sync/milestone-features.ts` — regex `/^Q[1-4]$/i`, returns uppercase
- [x] 8.3 Update `syncMilestoneFeatures()` to call `parseQuarterTag()` and store `quarter` on the Milestone upsert
- [x] 8.4 Write tests for updated `computeProgramMilestoneRollup()` — group by `Qx` tag, exclude null-quarter milestones from quarterly counts
- [x] 8.5 Update `computeProgramMilestoneRollup()` in `lib/milestones/calculator.ts` to use `milestone.quarter` for grouping instead of inferring from `targetMonth`
- [x] 8.6 Add `quarter` field to `ApiMilestoneWithProgress` response in `app/api/milestones/route.ts`
- [x] 8.7 Add `quarter` field to `MilestoneGoalViewModel` and `ApiMilestoneProgress` in `lib/dashboard/types.ts`

## Notes

- The `Milestone` table may need a `quarter` column. If so, add a Prisma migration. Alternatively, `quarter` can be derived at API time from `WorkItem.tags` — decide during implementation based on the simpler approach.
- Fiscal quarter mapping: Q4 FY26 = Jan–Mar 2026, Q1 FY27 = Apr–Jun 2026, etc. But the system stores the raw `Qx` value — fiscal year interpretation is a display concern.
- `ProgramMilestoneRollup.quarter` field is added so the UI knows which quarter is being reported.
- This story can run in parallel with Stories 9 and 10 (all depend on Story 7, not on each other).

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Quarterly roll-up uses explicit `Qx` tag, not inferred from month
