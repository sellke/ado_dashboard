# Story 1: Feature Goal Sync

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard user
**I want** ADO Features tagged with monthly goal identifiers (e.g., `Feb-Goal`) to be automatically synced and linked to Milestone records
**So that** the dashboard can display ADO-driven monthly goal progress without manual data entry

## Acceptance Criteria

- [x] Given an ADO Feature with tag `Feb-Goal` in a workstream's area path, when the sync runs, then the Feature is upserted to the `WorkItem` table with `type=Feature` ✅
- [x] Given a synced Feature WorkItem with a `-Goal` tag, when sync completes, then a `Milestone` record is created or updated with `adoFeatureId`, `workstreamId`, `title`, and `targetMonth` derived from the tag ✅
- [x] Given `Feb-Goal` tag, when parsing, then `targetMonth` is set to `2026-02-01` (current year, adjusted if month has passed) ✅
- [x] Given a Feature with no `-Goal` tag, when sync runs, then no Milestone record is created from it ✅
- [x] Given the sync orchestrator, when a Full sync runs, then the Feature Goal Sync step is included and logged in `SyncLog` ✅

## Implementation Tasks

- [x] 1.1 Write tests for `buildFeatureGoalWiql()` — area path only, no iteration filter, Feature type, tag contains `-Goal` ✅
- [x] 1.2 Write tests for `parseGoalTag()` — `Feb-Goal` → `Date(2026-02-01)`, all 12 months, year rollover logic ✅
- [x] 1.3 Write tests for `upsertMilestoneFromFeature()` — creates new, updates existing, skips non-goal Features ✅
- [x] 1.4 Create `lib/sync/milestone-features.ts` implementing `buildFeatureGoalWiql`, `parseGoalTag`, `syncMilestoneFeatures` (fetches + upserts WorkItems + upserts Milestones) ✅
- [x] 1.5 Update `lib/sync/orchestrator.ts` to call `syncMilestoneFeatures` per workstream in the Full sync flow ✅
- [x] 1.6 Verify: run sync against test data, confirm Milestone records created with correct `targetMonth` values ✅

## Notes

- WIQL: `SELECT [System.Id] FROM WorkItems WHERE [System.AreaPath] UNDER '{areaPath}' AND [System.WorkItemType] = 'Feature' AND [System.Tags] CONTAINS '-Goal' ORDER BY [System.Id]`
- `parseGoalTag` must handle all 12 month abbreviations; if the parsed month is in the past relative to today, roll forward to next year
- Reuse `upsertWorkItems` from `lib/sync/work-items.ts` for the WorkItem upsert step
- Milestone status at sync time: compute from child story progress — or default to `NotStarted` at sync, let progress calculator update status separately (simpler for Story 1)
- The new sync step is additive — existing Full sync still runs Iterations, WorkItems, Capacity first
- Add a new `SyncType` enum value if needed (e.g., `Milestones`) or include in `Full` only

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (37/37) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
