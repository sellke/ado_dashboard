# Story 4: Workstream Card Integration

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Stories 1, 2, 3

## User Story

**As a** dashboard viewer
**I want to** see the sprint story list directly within each workstream card
**So that** I can drill down from velocity trends to individual stories without leaving the dashboard

## Acceptance Criteria

- [x] SprintStoryListPanel renders below VelocityTrendChart in each WorkstreamHealthCard
- [x] Sprint stories data is fetched per workstream from the new API endpoint
- [x] Loading state shows skeleton or spinner while stories load
- [x] Error state shows inline error message (does not break the rest of the card)
- [x] Stories data refreshes when dashboard sync completes
- [x] Panel is hidden when workstream has no sprint data at all
- [x] No regression in existing workstream card functionality

## Implementation Tasks

- [x] 4.1 Write integration tests (panel placement, data flow, loading/error states, sync refresh)
- [x] 4.2 Add sprint stories state management to DashboardContainer (fetch, loading, error per workstream)
- [x] 4.3 Extend WorkstreamCardViewModel or add separate prop for sprint stories data
- [x] 4.4 Wire SprintStoryListPanel into WorkstreamHealthCard layout (below velocity chart)
- [x] 4.5 Handle loading/error states in WorkstreamHealthCard for stories data
- [x] 4.6 Trigger stories refresh after sync completion
- [x] 4.7 Verify no regression in existing card tests and visual appearance

## Notes

- Follow the milestones pattern: DashboardContainer fetches milestones separately and passes as additional props
- Consider whether to fetch all workstream stories in one batch call or individual calls per workstream
- Stories should load after the main metrics to avoid slowing initial dashboard render (progressive loading)
- The panel should be visually distinct but not dominate the card — it's supplementary to the velocity chart

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (including existing card tests)
- [x] Code reviewed
- [x] Dashboard renders correctly with new panel
- [x] No performance regression
