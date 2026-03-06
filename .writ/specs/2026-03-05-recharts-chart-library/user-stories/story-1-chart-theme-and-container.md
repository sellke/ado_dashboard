# Story 1: Chart Theme Infrastructure and Container

> **Status:** Pending
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** developer  
**I want** a chart theming system that resolves Mantine color tokens and supports dark mode  
**So that** all charts stay visually consistent with the app's design system

## Acceptance Criteria

- Given a Mantine color token like `'blue.6'`, when `resolveColor()` is called, then it returns the computed CSS color value
- Given the app is in dark mode, when a chart renders, then axis labels, grid lines, and tooltip backgrounds use dark-mode-appropriate colors
- Given a chart is placed in a Card component, when the container renders, then it uses ResponsiveContainer with `overflow: visible` handling (replacing the global CSS hack)
- Given `useChartTheme()` is called, when the Mantine color scheme changes, then the returned theme values update reactively

## Implementation Tasks

- [ ] 1.1 Write tests for `useChartTheme()` hook — color resolution, dark mode switching, edge cases (invalid tokens)
- [ ] 1.2 Implement `lib/charts/theme.ts` — `useChartTheme()` hook with `resolveColor()`, axis/grid/tooltip color sets for light and dark modes
- [ ] 1.3 Write tests for `ChartContainer` — responsive sizing, overflow handling, renders children
- [ ] 1.4 Implement `lib/charts/ChartContainer.tsx` — wraps Recharts `ResponsiveContainer`, handles overflow visibility
- [ ] 1.5 Create `lib/charts/types.ts` — shared types (`ChartSeries`, `ChartTheme`, common prop types)
- [ ] 1.6 Create `lib/charts/index.ts` — barrel export for all public API
- [ ] 1.7 Verify all tests pass and exports are correct

## Notes

- Replacing `@mantine/charts` with a reusable Recharts-based chart library in `lib/charts/`.
- The library provides thin wrappers with Mantine theme integration, dark mode, and escape hatches to raw Recharts props.
- `ChartContainer` replaces the global CSS hack for overflow visibility when charts are placed in Card components.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Documentation updated
