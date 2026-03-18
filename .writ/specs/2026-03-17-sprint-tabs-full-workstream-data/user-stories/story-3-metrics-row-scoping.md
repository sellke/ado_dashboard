# Story 3: Metrics Row Responds to Active Sprint

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 2

## User Story

**As a** program manager
**I want** the workstream metrics row to show rolling averages as-of the selected sprint
**So that** I can see how each workstream was trending at any point in the rolling window

## Acceptance Criteria

- [x] Given a completed sprint is selected, when viewing a workstream card, then "Avg Velocity" shows the rolling velocity average as-of that sprint
- [x] Given a completed sprint is selected, when viewing a workstream card, then "Velocity Rate" shows the actual velocity rate for that sprint
- [x] Given a completed sprint is selected, when viewing a workstream card, then "Overhead %" shows the rolling overhead average as-of that sprint
- [x] Given a completed sprint is selected, when viewing a workstream card, then "Carry-Over %" shows the rolling carry-over average as-of that sprint
- [x] Given the current sprint is selected (default), when viewing a workstream card, then metrics display identically to today's behavior

## Implementation Tasks

- [x] 3.1 Write tests for WorkstreamHealthCard metrics extraction from active sprint's trend data
- [x] 3.2 Add sprint-scoped metrics extraction logic in WorkstreamHealthCard — find the matching trend sprint by `activeSprintId` and extract rolling avg fields
- [x] 3.3 Override metric tile values with the extracted rolling averages when a non-current sprint is selected
- [x] 3.4 Handle velocity rate separately — show actual `velocityRate` from the matched trend sprint (not a rolling average)
- [x] 3.5 Implement fallback: when no matching trend sprint found, keep default behavior
- [x] 3.6 Verify metrics reset to default values when current sprint tab is re-selected

## Notes

- The current metrics tiles are built in `adapter.ts` via `mapApiMetricToTile` and then customized (velocity avg override, carry-over formatting, etc.)
- For sprint-scoped display, the component should override the tile values after the adapter has built them — this keeps the adapter simple
- Use existing formatting helpers: `formatMetricValue`, `formatCarryOverRate`, `formatVelocityRate`
- The "avg" sublabel on tiles should be hidden when viewing a non-current sprint (rolling avg IS the primary value)

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Default behavior unchanged when current sprint selected
