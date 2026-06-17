# Current UI References

The user selected "match existing app patterns" for visual references. No browser screenshot was
captured in this run; these references document the current component patterns to preserve during
implementation.

## Modal Patterns

- `components/Dashboard/CycleTimeBreakdown.tsx` uses Mantine `Modal`, local selected-item state,
  loading/error/empty handling, and a table layout for drilldown details.
- `components/Dashboard/WorkstreamScopeModal.tsx` uses a centered `xl` modal for larger dashboard
  configuration surfaces.
- `components/Dashboard/MetricConfigPanel.tsx` uses a large modal with tabs and dense metric
  configuration content.
- `components/Dashboard/AdoCredentialsModal.tsx` uses a simpler centered modal for focused tasks.

## Metric Tile Patterns

- `components/Dashboard/ProgramSummarySection.tsx` renders program metrics as Mantine `Card`
  elements in a `SimpleGrid`.
- `components/Dashboard/WorkstreamHealthCard.tsx` renders workstream metrics as compact `Group`
  rows inside each card.
- `MetricDefinitionHint` is rendered beside metric labels.
- `RagBadge` is rendered near values and may have tooltip behavior.

## Visual Direction

- Preserve the existing dashboard card density and Mantine styling.
- Add a clear but low-noise drilldown affordance only to supported metrics.
- Use the modal for explanation and sprint-by-sprint detail, not for editing.
- Keep `N/A` and partial-history states visually calm and consistent with existing dashboard copy.
