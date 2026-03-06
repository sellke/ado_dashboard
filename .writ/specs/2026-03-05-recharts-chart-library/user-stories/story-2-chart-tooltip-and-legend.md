# Story 2: Shared Chart Tooltip and Legend Components

> **Status:** Pending
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** developer  
**I want** reusable tooltip and legend components that integrate with the chart theme  
**So that** all charts have consistent hover feedback and series labeling

## Acceptance Criteria

- Given a chart is hovered, when the tooltip renders, then it shows formatted values with theme-aware colors and backgrounds
- Given multiple series with the same value at a data point, when the tooltip renders, then duplicates are deduplicated (preserving current PointValueTooltip behavior)
- Given a chart with multiple series, when ChartLegend renders, then it shows colored indicators (solid/dashed) matching each series
- Given dark mode is active, when tooltip and legend render, then they use theme-appropriate background and text colors

## Implementation Tasks

- [ ] 2.1 Write tests for `ChartTooltip` — single value, multi-value, deduplication, dark mode styling, null/undefined handling
- [ ] 2.2 Implement `lib/charts/ChartTooltip.tsx` — evolved from `PointValueTooltip`, uses `useChartTheme()` for colors
- [ ] 2.3 Write tests for `ChartLegend` — renders items, solid vs dashed indicators, resolves Mantine color tokens
- [ ] 2.4 Implement `lib/charts/ChartLegend.tsx` — evolved from current `ChartLegend`, uses `resolveColor()` instead of `mantineColorVar()`
- [ ] 2.5 Update barrel export in `lib/charts/index.ts`
- [ ] 2.6 Verify all tests pass

## Notes

- `ChartTooltip` evolves from existing `PointValueTooltip` component.
- `ChartLegend` evolves from current `ChartLegend`; migration from `mantineColorVar()` to `resolveColor()` for Mantine token resolution.
- Both components must integrate with `useChartTheme()` for consistent theming.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
