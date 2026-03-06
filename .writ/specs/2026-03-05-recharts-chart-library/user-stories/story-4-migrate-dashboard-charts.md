# Story 4: Migrate Dashboard Chart Components to New Library

> **Status:** Pending
> **Priority:** High
> **Dependencies:** Story 1, Story 2, Story 3

## User Story

**As a** developer  
**I want** all existing Dashboard chart components migrated to use the new `lib/charts/` library  
**So that** the dashboard renders identically using Recharts directly instead of through @mantine/charts

## Acceptance Criteria

- Given each migrated chart component, when it renders with the same data, then the visual output is equivalent to the pre-migration version
- Given `VelocityTrendChart`, when it renders, then it uses `AppLineChart` from `lib/charts/` with reference lines and forecast dashed series
- Given `OverheadBreakdownChart`, when it renders, then it uses `AppLineChart` with 4 overhead category series
- Given `OverheadCompositionChart`, when it renders, then it uses `AppBarChart` with stacked mode
- Given `BurnupChart`, when it renders, then it uses `AppAreaChart` with completed and target series
- Given `ProgramSummarySection`, when its inline charts render, then they use `AppLineChart` and `AppBarChart` from the library
- Given all existing tests, when they run after migration, then they pass (updated mocks/assertions as needed)

## Implementation Tasks

- [ ] 4.1 Migrate `VelocityTrendChart` — replace `@mantine/charts` LineChart with `AppLineChart`, update imports
- [ ] 4.2 Update `VelocityTrendChart.test.tsx` — adjust mocks and assertions for Recharts DOM structure
- [ ] 4.3 Migrate `OverheadBreakdownChart` — replace with `AppLineChart`, update imports
- [ ] 4.4 Update `OverheadBreakdownChart.test.tsx`
- [ ] 4.5 Migrate `OverheadCompositionChart` — replace with `AppBarChart` (stacked), update imports
- [ ] 4.6 Update `OverheadCompositionChart.test.tsx`
- [ ] 4.7 Migrate `BurnupChart` — replace with `AppAreaChart`, update imports
- [ ] 4.8 Update `BurnupChart.test.tsx`
- [ ] 4.9 Migrate `ProgramSummarySection` — replace inline velocity and bug burndown charts with `AppLineChart` and `AppBarChart`
- [ ] 4.10 Update `ProgramSummarySection.test.tsx`

## Notes

- This is the largest story. The `buildChartData` transform functions stay in the Dashboard components — only the chart rendering layer changes.
- `ProgramSummarySection` inline charts should be migrated as part of this story since they use the same patterns.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
