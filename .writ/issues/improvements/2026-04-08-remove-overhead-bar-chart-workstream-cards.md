# Remove Overhead Bar Chart and Item Tables from Workstream Cards

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Small
> **Created:** 2026-04-08
> **spec_ref:** _

## TL;DR

Strip the overhead section in each workstream card down to the line chart only — remove the stacked bar chart (`OverheadCompositionChart`) and the per-sprint item tables (`CurrentSprintItemTables`).

## Current State

- `WorkstreamHealthCard` renders an `OverheadBreakdownPanel` when overhead data is present
- `OverheadBreakdownPanel` renders three sub-components in sequence:
  1. `OverheadCompositionChart` — a stacked `AppBarChart` showing overhead hours by category per sprint
  2. `OverheadBreakdownChart` — a line chart showing the same data over time
  3. `CurrentSprintItemTables` — per-sprint item tables for bugs, spikes, and support
- The bar chart duplicates what the line chart already shows
- The item tables are redundant given other layout changes: bugs will be listed directly under the bug burndown chart, meetings never surface in the data, and support items are too coarse-grained to add value here

## Expected Outcome

- `OverheadBreakdownPanel` renders only the `OverheadBreakdownChart` (line chart)
- `OverheadCompositionChart` is no longer rendered; component file can be deleted or retained for future use
- `CurrentSprintItemTables` is no longer rendered inside `OverheadBreakdownPanel`; component file can be deleted or retained
- The `overheadItemsBySprint` prop on `WorkstreamHealthCard` and `OverheadBreakdownPanel` can be dropped once `CurrentSprintItemTables` is removed

## Relevant Files

- `components/Dashboard/OverheadBreakdownPanel.tsx` — remove `<OverheadCompositionChart>` and `<CurrentSprintItemTables>` renders and their imports; drop `overheadItemsBySprint` prop
- `components/Dashboard/OverheadCompositionChart.tsx` — bar chart component to remove/archive
- `components/Dashboard/CurrentSprintItemTables.tsx` — item tables component to remove/archive
- `components/Dashboard/WorkstreamHealthCard.tsx` — remove `overheadItemsBySprint` prop pass-through
- `__tests__/components/Dashboard/OverheadBreakdownPanel.test.tsx` — update assertions that expect the bar chart or item tables to be present

## Related Issues

- [2026-04-09-workstream-card-layout-story-bug-ordering](../improvements/2026-04-09-workstream-card-layout-story-bug-ordering.md) - companion layout change that moves bug list under the bug burndown (making the overhead item tables redundant)

## Notes

`OverheadBreakdownPanel` accepts `overheadComposition` as a prop solely to pass to `OverheadCompositionChart`. Once both the chart and item tables are removed, the `overheadComposition` and `overheadItemsBySprint` props and their types can be fully pruned from the component tree.
