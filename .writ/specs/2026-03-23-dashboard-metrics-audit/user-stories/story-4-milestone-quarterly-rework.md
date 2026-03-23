# Story 4: Milestone Section Quarterly Rework

**Spec:** Dashboard Metrics Audit (Story 4 of 5)

> Status: Complete

## Context

The Program Summary section currently shows ADP milestones as simple count cards (Total / Complete / In Progress / Not Started) with a current month SP summary. Leadership needs a more granular view: per-Feature milestone, per-workstream child story breakdowns, grouped by quarter.

The milestones API already returns per-milestone progress (`completedPoints`, `totalPoints`, `percentComplete`, `burnupData`). It also returns child stories. What's needed is extending the API to include per-workstream story breakdowns, building adapter logic to group by quarter, and creating a new UI component.

## User Story

As a senior director reviewing quarterly commitments, I want to see milestone progress broken down by Feature and workstream with story-level progress percentages so that I can identify which areas are on track and which need attention.

## Acceptance Criteria

1. Given milestones with Q-tagged Features, When the Program Summary renders, Then milestones are grouped by quarter (Q1, Q2, Q3, Q4)
2. Given a Feature milestone with child stories across workstreams, When displayed, Then each workstream shows: total story count, % in progress, % completed
3. Given "In Progress" classification, Then it uses ADO state mapping: Active status group
4. Given "Completed" classification, Then it uses ADO state mapping: Resolved/Completed status groups (Resolved, Closed, Done)
5. Given a Feature with no child stories for a workstream, Then that workstream is not shown under that Feature
6. Given a milestone with no quarter tag, Then it appears in an "Untagged" group at the end

## Implementation Tasks

- [x] Extend `GET /api/milestones` response: for each milestone, include `workstreamBreakdown: Array<{ workstreamId, workstreamName, totalStories, inProgressCount, inProgressPercent, completedCount, completedPercent }>`
- [x] Add per-workstream story classification logic in the milestones route using ADO state mapping (`mapStateToStatusGroup` or equivalent)
- [x] Add new types to `lib/milestones/types.ts`: `MilestoneWorkstreamBreakdown`, extend `ApiMilestoneWithProgress`
- [x] Add new view model types to `lib/dashboard/types.ts`: `MilestoneQuarterGroup`, `MilestoneFeatureViewModel`, `MilestoneWorkstreamProgress`
- [x] Add quarterly grouping + workstream breakdown mapping in `lib/dashboard/adapter.ts`
- [x] Create `components/Dashboard/MilestoneQuarterlyPanel.tsx` — renders quarter groups with Feature rows and workstream sub-rows
- [x] Update `components/Dashboard/ProgramSummarySection.tsx` — replace count-card milestone section with `MilestoneQuarterlyPanel`
- [x] Add tests for the API workstream breakdown logic
- [x] Add tests for the adapter quarterly grouping
- [x] Add component tests for `MilestoneQuarterlyPanel`

## Technical Notes

- The milestones route already queries child stories by `parentAdoId` and groups them by feature. Extend this to also group by workstream (using `story.workstreamId` which comes from the WorkItem's workstream relation).
- Child stories already have workstream assignment via `WorkItem.workstreamId` — no schema changes needed.
- ADO state classification should reuse `mapStateToStatusGroup` from `lib/sprints/status-mapping.ts` or equivalent logic.
- Quarter tags (Q1–Q4) are already stored on milestones via the `quarter` field.
- Handle edge case: milestones without quarter tags should appear in an "Untagged" group.

## Metadata

| Field | Value |
|-------|-------|
| **Dependencies** | None (can start in parallel with other stories) |
| **Priority** | High (core audit finding) |

## Definition of Done

- [x] API returns per-workstream story breakdowns per milestone
- [x] Milestones grouped by quarter in the UI
- [x] Each Feature shows per-workstream: story count, % in progress, % completed
- [x] ADO state mapping used for In Progress / Completed classification
- [x] Empty states handled (no stories, no quarter tag)
- [x] API tests pass
- [x] Adapter tests pass
- [x] Component tests pass
