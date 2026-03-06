# Story 3: Line, Bar, and Area Chart Primitives

> **Status:** Pending
> **Priority:** High
> **Dependencies:** Story 1, Story 2

## User Story

**As a** developer  
**I want** thin wrapper components around Recharts LineChart, BarChart, and AreaChart that provide sensible defaults and escape hatches  
**So that** I can build charts quickly while retaining full Recharts power when needed

## Acceptance Criteria

- Given a `series` prop with Mantine color tokens, when the chart renders, then colors are resolved via `useChartTheme()`
- Given no custom `children`, when the chart renders, then it includes default XAxis, YAxis, CartesianGrid, and Tooltip with theme-aware styling
- Given custom Recharts sub-components passed as `children`, when the chart renders, then default sub-components are overridable
- Given a `dataKey` and `data` prop, when each chart type renders, then it produces the correct Recharts SVG output
- Given the `type="stacked"` prop on BarChart, when it renders, then bars are stacked (matching current OverheadCompositionChart behavior)
- Given the `curveType` prop on LineChart, when it renders, then the line interpolation matches the specified type

## Implementation Tasks

- [ ] 3.1 Write tests for `AppLineChart` — renders with data, series color resolution, default axis/tooltip, escape hatch children, reference lines, dashed series
- [ ] 3.2 Implement `lib/charts/LineChart.tsx` — thin wrapper with sensible defaults, `series` prop, `children` escape hatch
- [ ] 3.3 Write tests for `AppBarChart` — renders with data, stacked mode, series colors, legend integration
- [ ] 3.4 Implement `lib/charts/BarChart.tsx` — thin wrapper, stacked support, `series` prop
- [ ] 3.5 Write tests for `AppAreaChart` — renders with data, dual series, dashed stroke support
- [ ] 3.6 Implement `lib/charts/AreaChart.tsx` — thin wrapper, area fill with theme opacity
- [ ] 3.7 Update barrel export, verify all tests pass

## Notes

- Chart primitives are thin wrappers; escape hatches via `children` allow full Recharts customization when needed.
- `AppBarChart` stacked mode should match current `OverheadCompositionChart` behavior.
- Existing chart components in `components/Dashboard/` will be migrated to use these primitives in a follow-up effort.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
