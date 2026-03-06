# Story 5: Storybook Stories for Chart Library

> **Status:** Pending
> **Priority:** Medium
> **Dependencies:** Story 3

## User Story

**As a** developer  
**I want** Storybook stories for each chart primitive and composition example  
**So that** I can visually verify chart behavior and use stories as documentation

## Acceptance Criteria

- Given a developer opens Storybook, when they navigate to the Charts section, then they see stories for LineChart, BarChart, AreaChart, ChartTooltip, and ChartLegend
- Given each chart story, when it renders, then it shows a working chart with realistic mock data
- Given a dark mode story variant, when it renders, then the chart uses dark-mode-appropriate colors
- Given a "Kitchen Sink" story, when it renders, then it demonstrates escape hatches (custom children, reference lines, etc.)

## Implementation Tasks

- [ ] 5.1 Create `lib/charts/LineChart.story.tsx` — basic, multi-series, with reference lines, dark mode variant
- [ ] 5.2 Create `lib/charts/BarChart.story.tsx` — basic, stacked, with legend, dark mode variant
- [ ] 5.3 Create `lib/charts/AreaChart.story.tsx` — basic, dual-series with dashed target, dark mode variant
- [ ] 5.4 Create `lib/charts/ChartTooltip.story.tsx` — single value, multi-value, dark mode
- [ ] 5.5 Create `lib/charts/ChartLegend.story.tsx` — various series configs, dashed indicators
- [ ] 5.6 Create `lib/charts/KitchenSink.story.tsx` — composition example with escape hatches, reference lines, custom axes
- [ ] 5.7 Verify all stories render correctly in Storybook

## Notes

- Stories serve as both visual regression and living documentation for the chart library.
- Dark mode variants should use Mantine's color scheme toggle or a decorator to simulate dark mode.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Stories render correctly in Storybook
- [ ] Code reviewed
- [ ] Documentation updated
