# Story 4: Detail Block Responds to Active Sprint

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 2

## User Story

**As a** program manager
**I want** the workstream detail block to show the selected sprint's planned, completed, and carry-over points
**So that** I can review any sprint's delivery details without navigating away

## Acceptance Criteria

- [x] Given a completed sprint is selected, when viewing a workstream card, then planned points show that sprint's value from MetricSnapshot
- [x] Given a completed sprint is selected, when viewing a workstream card, then completed points show that sprint's value
- [x] Given a completed sprint is selected, when viewing a workstream card, then carry-over points show that sprint's value
- [x] Given a completed sprint is selected, when viewing a workstream card, then the detail sprint label updates to show the selected sprint's name and date range
- [x] Given the current sprint is selected (default), when viewing a workstream card, then detail block displays identically to today's behavior (prior sprint's data)

## Implementation Tasks

- [x] 4.1 Write tests for WorkstreamHealthCard detail extraction from active sprint's trend data
- [x] 4.2 Extract plannedPoints, completedPoints, carryOverPoints from the matched trend sprint's enriched data
- [x] 4.3 Override the detail block values when a non-current sprint is selected
- [x] 4.4 Update the detail sprint label to show the selected sprint's name (extracted from trend sprint)
- [x] 4.5 Handle null values gracefully — display "N/A" when snapshot data is missing
- [x] 4.6 Verify detail block resets to default when current sprint tab is re-selected

## Notes

- Current detail block shows: `detailSprintLabel`, `detail.plannedPoints`, `detail.completedPoints`, `detail.carryOverPoints`
- When current sprint is selected, detail shows the PRIOR sprint's data (to avoid mid-sprint partials) — this existing behavior must be preserved
- When a completed sprint is selected, detail shows THAT sprint's actual data from MetricSnapshot
- The sprint name for the label is available in `TrendSprintViewModel.sprintName`

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Default behavior unchanged when current sprint selected
