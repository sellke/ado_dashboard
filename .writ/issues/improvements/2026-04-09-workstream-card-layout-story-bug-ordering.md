# Workstream Card: Align Stories Under Points Graph, Bugs Under Bug Burndown

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Small
> **Created:** 2026-04-09
> **spec_ref:** _(set automatically when promoted via `/create-spec --from-issue`)_

## TL;DR

Reorder the sections inside each workstream card so stories list directly follows the velocity/points chart, and the bug list directly follows the bug burndown — making the information flow logically from chart to detail.

## Current State

The render order in `WorkstreamHealthCard` is:

1. Metric tiles (Avg Velocity, Velocity Rate, Overhead %, Carry-Over %)
2. Last Sprint detail block (Planned / Completed / Carry-over)
3. **Velocity (Points) chart** — `VelocityTrendChart`
4. **Bug Burndown chart** — `AppBarChart`
5. **Sprint Stories list** — `SprintStoryListPanel`
6. Overhead breakdown — `OverheadBreakdownPanel`

Stories are separated from the points chart by the bug burndown, and the bug list (rendered inside `SprintStoryListPanel` — or wherever bugs are surfaced) is not adjacent to the bug burndown chart.

## Expected Outcome

Render order becomes:

1. Metric tiles
2. Last Sprint detail block
3. **Velocity (Points) chart** — `VelocityTrendChart`
4. **Sprint Stories list** — immediately below the points chart
5. **Bug Burndown chart** — `AppBarChart`
6. **Bug list** — immediately below the bug burndown chart
7. Overhead breakdown — `OverheadBreakdownPanel`

Each chart is followed directly by the data it summarises, so readers scan top-to-bottom without jumping between related sections.

## Relevant Files

- `components/Dashboard/WorkstreamHealthCard.tsx` — reorder the `<Stack>` sections: move `SprintStoryListPanel` block to immediately after `VelocityTrendChart`, and ensure the bug list (if separate) follows the `AppBarChart` bug burndown block

## Related Issues

- [2026-04-08-remove-overhead-bar-chart-workstream-cards](../improvements/2026-04-08-remove-overhead-bar-chart-workstream-cards.md) - companion cleanup: removes overhead bar chart and item tables (bugs in overhead tables become redundant once bugs are listed under the burndown)
- [2026-04-09-exclude-bug-points-from-sprint-metrics](../improvements/2026-04-09-exclude-bug-points-from-sprint-metrics.md) - related data correctness work on bug points vs bug hours

## Notes

- Confirm whether bugs have their own dedicated list panel or whether they currently appear inside `SprintStoryListPanel`; the issue description implies they are distinct. If they share a single panel, the panel itself may need splitting to support this layout.
- No logic changes required — this is a render-order-only change unless the panels need splitting.
