# Story 5: Velocity Chart Highlights Selected Sprint

> **Status:** Complete
> **Priority:** Medium
> **Dependencies:** None

## User Story

**As a** program manager
**I want** the velocity trend chart to visually highlight the currently selected sprint
**So that** I can see where the selected sprint falls in the velocity trend

## Acceptance Criteria

- [x] Given a sprint tab is selected, when viewing the velocity chart, then the selected sprint's data point is visually distinct from other points
- [x] Given the current sprint is selected (default), when viewing the velocity chart, then the current sprint point is highlighted
- [x] Given a sprint tab changes, when the chart re-renders, then the highlight moves to the newly selected sprint

## Implementation Tasks

- [x] 5.1 Write tests for VelocityTrendChart with activeSprintId prop
- [x] 5.2 Add `activeSprintId` prop to VelocityTrendChart component
- [x] 5.3 Implement visual highlight for the selected sprint's data point (larger dot radius or different fill color)
- [x] 5.4 Update WorkstreamHealthCard to pass `activeSprintId` to VelocityTrendChart
- [x] 5.5 Verify chart renders correctly when no activeSprintId is provided (backward compat)

## Notes

- VelocityTrendChart uses Recharts (via Mantine Charts) for rendering
- The chart renders `trendSprints` as data points with a line connecting them
- Highlight approach: use Recharts' `dot` customization to render a larger/different dot for the active sprint
- Keep it subtle — the chart context is more important than the highlight
- The prediction point (dashed line) should never be highlighted since it's not a real sprint

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] Chart rendering unaffected when prop is omitted
