# Story 3: Wire Overhead Composition Stacked Bar Chart

**Spec:** Dashboard Metrics Audit (Story 3 of 5)

> Status: Complete

## Context

`OverheadCompositionChart.tsx` (a stacked bar chart showing ceremony/bug/spike/support hours per sprint) already exists as a component with tests and Storybook stories. However, it's not wired into the dashboard. Only `OverheadBreakdownChart.tsx` (multi-line trend chart) is displayed in `OverheadBreakdownPanel`. The user wants BOTH charts visible.

The overhead composition data is already mapped by the adapter to `OverheadCompositionViewModel[]` on `WorkstreamCardViewModel.overheadComposition`.

## User Story

As a program lead, I want to see both the overhead composition stacked bar chart AND the overhead trend line chart in each workstream card so that I can understand both the per-sprint breakdown and the trend over time.

## Acceptance Criteria

1. Given a workstream card with overhead data, When the overhead section renders, Then both the stacked bar composition chart AND the multi-line trend chart are visible
2. Given a workstream with no overhead data, When the card renders, Then neither chart appears (existing empty-state behavior)
3. Given the composition data from `card.overheadComposition`, When passed to `OverheadCompositionChart`, Then it renders correctly with ceremony/bug/spike/support stacked bars

## Implementation Tasks

- [x] Import `OverheadCompositionChart` in `OverheadBreakdownPanel.tsx`
- [x] Pass `overheadComposition` data through from `WorkstreamHealthCard` to `OverheadBreakdownPanel`
- [x] Add `overheadComposition` prop to `OverheadBreakdownPanelProps` interface
- [x] Render `OverheadCompositionChart` in `OverheadBreakdownPanel` (above or below the line chart)
- [x] Update `WorkstreamHealthCard.tsx` to pass `card.overheadComposition` to `OverheadBreakdownPanel`
- [x] Update component tests for `OverheadBreakdownPanel` to verify both charts render

## Technical Notes

- `OverheadCompositionChart` uses `AppBarChart` with `type="stacked"` and series: Ceremony (blue), Bugs (red), Spikes (orange), Support (yellow)
- The composition data is already available on `card.overheadComposition` — no API or adapter changes needed
- Recommend placing the stacked bar chart above the line chart (composition first, then trends)

## Metadata

| Field | Value |
|-------|-------|
| **Dependencies** | None |
| **Priority** | Medium (chart addition) |

## Definition of Done

- [x] Both stacked bar and line charts visible in overhead section
- [x] Composition chart renders correctly with stacked categories
- [x] Empty state handled (no charts when no data)
- [x] Component tests updated
