# Story 3: Velocity Trend Chart Component

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 2 (types and adapter)

## User Story

**As a** stakeholder viewing workstream health
**I want to** see a velocity trend line chart per workstream with rolling average and prediction
**So that** I can quickly assess velocity trajectory and forecast for the current sprint

## Acceptance Criteria

- [x] Given 4 completed sprints with velocity data, when the chart renders, then a solid line with dots shows velocity per sprint ✅
- [x] Given a rolling average value, when the chart renders, then a horizontal dashed reference line appears labeled "Avg: X" ✅
- [x] Given a current-sprint prediction, when the chart renders, then a dashed line segment extends from the last actual point to the predicted value ✅
- [x] Given the prediction point, when displayed on the X-axis, then its label includes "(Forecasted)" suffix ✅
- [x] Given a workstream with no trend data, when the component renders, then a "No trend data available" empty state is shown ✅
- [x] Given the chart is rendered within a card, then its height is approximately 200px ✅

## Implementation Tasks

- [x] 3.1 Write component tests for VelocityTrendChart: renders with data, renders empty state, shows reference line, shows prediction ✅
- [x] 3.2 Create `components/Dashboard/VelocityTrendChart.tsx` with props interface accepting trend sprints and prediction ✅
- [x] 3.3 Build chart data transformation: map TrendSprintViewModel[] to LineChart data format with "Completed Points" series ✅
- [x] 3.4 Add prediction data point with dashed line series (matching ProgramSummarySection pattern: last actual gets both series values, prediction gets only dashed value) ✅
- [x] 3.5 Configure reference line using Mantine LineChart `referenceLines` prop for rolling average (computed internally from trendSprints) ✅
- [x] 3.6 Style chart: ~200px height, abbreviated sprint name X-axis labels, auto Y-axis domain, tooltip on hover ✅

## Notes

- Pattern to follow: `buildVelocityChartData()` in `ProgramSummarySection.tsx` already does actual + predicted line chart data assembly
- Mantine LineChart supports `referenceLines` prop: `[{ y: avgValue, color: 'gray.5', label: 'Avg: X' }]`
- Prediction line uses `strokeDasharray: '5 5'` in the series config
- The chart should handle null velocity values gracefully (skip point, don't connect)
- Component is pure presentational — receives formatted data, no data fetching
- Rolling average computed internally from trendSprints (not a prop)
- Prediction label always gets "(Forecasted)" suffix appended

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Component tests passing (12/12, 100%) ✅
- [x] Chart matches program-level velocity chart styling ✅
