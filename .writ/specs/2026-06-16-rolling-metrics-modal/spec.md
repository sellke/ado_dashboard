# Rolling Metrics Detail Modal

> **Status:** Complete
> **Created:** 2026-06-16
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-06-16-rolling-metrics-modal.md`
> **Contract Locked:** yes

## Specification Contract

**Deliverable:** Add a rolling metrics detail modal that opens from selected dashboard metric
tiles and shows per-sprint values plus rolling averages for velocity rate, overhead %,
carry-over %, and program-level `Avg Total Delivery/Bug`.

**Must Include:** Users can inspect the configured rolling sprint window behind each supported
metric instead of only seeing the current tile value.

**Hardest Constraint:** The first three metrics already have rolling-average fields on trend
sprints, but `Avg Total Delivery/Bug` does not appear to have per-sprint trend fields in the
dashboard view model yet. The implementation must explicitly add additive API/view-model support
for program-level delivery-to-bug drilldown data.

### Experience Design

- **Entry point:** Click or activate an affordance on supported metric tiles in
  `ProgramSummarySection` and `WorkstreamHealthCard`.
- **Happy path:** User opens a metric tile, sees the current or average value, a sprint-by-sprint
  table or compact trend list across the rolling window, and the same metric definition/RAG context
  used elsewhere.
- **Moment of truth:** The user can explain why a RAG badge or average looks the way it does by
  seeing each sprint contributing to it.
- **Feedback model:** Modal opens immediately from already-loaded dashboard data where possible;
  no new full-page navigation.
- **Error experience:** Nulls, missing sprint history, and unavailable metric inputs render as
  `N/A` or explanatory empty rows without breaking the dashboard.

### Business Rules

- Velocity rate uses points per net capacity hour and displays in `pts/hr`.
- Overhead % and carry-over % display as percentages with existing two-decimal formatting.
- Program `Avg Total Delivery/Bug` is included only at program scope.
- Workstream `Delivery/Bug` drilldown is explicitly out of scope for this spec.
- Delivery-to-bug follows the completed ratio rules: sum completed delivery points over bug hours,
  with existing zero-bug display and RAG behavior.
- Rolling window aligns to the configured dashboard window, currently represented by the metrics
  response trend sprints.

### Success Criteria

1. Supported program and workstream metric tiles expose an accessible drilldown affordance.
2. The modal shows per-sprint values across the rolling window and highlights the aggregate or
   current value the tile represents.
3. Program-level `Avg Total Delivery/Bug` has an explicit API/view-model data source for modal rows.
4. Null values, unavailable data, and insufficient sprint history render gracefully.
5. Component and adapter tests cover modal opening, metric-specific values, and empty states.

### Scope Boundaries

**Included:**

- A reusable rolling metric detail modal component.
- Click/keyboard wiring from supported metric tiles.
- Adapter/type additions needed to expose modal-ready rolling metric rows.
- Program-level `Avg Total Delivery/Bug` drilldown data.
- Current UI pattern references based on existing dashboard modal and metric tile components.
- Tests for program and workstream entry points.

**Excluded:**

- Changing metric calculations.
- Changing RAG thresholds.
- Adding workstream `Delivery/Bug` drilldown.
- Altering rolling-window selection, sync depth, or sprint tab behavior.
- Introducing new persistence or schema changes unless implementation discovery proves existing
  API data cannot carry the required delivery-to-bug fields.

### Technical Concerns

- `TrendSprintViewModel` currently carries `velocityAvg`, `overheadPercentAvg`, and
  `carryOverRateAvg`, but not delivery-to-bug fields. Add this intentionally through the metrics API
  and adapter instead of deriving ambiguous values inside React components.
- Current metric tiles are rendered as static `Card` and `Group` content. The implementation needs
  an accessible button or clickable region that does not interfere with metric definition tooltips
  or RAG badge tooltips.
- The modal should reuse the established Mantine `Modal` patterns from `CycleTimeBreakdown`,
  `WorkstreamScopeModal`, and other dashboard panels.

### Recommendations

- Keep metric math out of React components; components should render values produced by
  `lib/dashboard/adapter.ts` and typed in `lib/dashboard/types.ts`.
- Model the modal rows as display-ready values plus raw values where helpful for tests.
- Treat the completed delivery-to-bug, rolling-window, and tooltip specs as foundations, not
  active conflicts.

## Current State

The dashboard already exposes the key metric tiles and trend data needed for most of the modal:

- `components/Dashboard/WorkstreamHealthCard.tsx` renders workstream metric rows and already
  overrides selected-sprint display values from `trendSprints`.
- `components/Dashboard/ProgramSummarySection.tsx` renders program-level metric cards, including
  `Avg Total Delivery/Bug` in the current branch.
- `lib/dashboard/adapter.ts` maps API trend sprints into `TrendSprintViewModel` and formats
  dashboard metric values.
- `lib/dashboard/types.ts` defines `ApiTrendSprint`, `TrendSprintViewModel`, `MetricTileViewModel`,
  and the program/workstream response contract.
- Existing Mantine modal examples include `CycleTimeBreakdown`, `WorkstreamScopeModal`,
  `MetricConfigPanel`, and `AdoCredentialsModal`.

## Detailed Requirements

### Supported Metrics

The modal supports these tile families:

| Scope | Tile | Modal rows |
|---|---|---|
| Program | `Avg Total Velocity Rate` | Per-sprint velocity rate plus the aggregate average |
| Program | `Avg Total Overhead %` | Per-sprint overhead % plus the aggregate average |
| Program | `Avg Total Carry-Over %` | Per-sprint carry-over % plus the aggregate average |
| Program | `Avg Total Delivery/Bug` | Per-sprint delivery-to-bug ratio plus the aggregate average |
| Workstream | `Velocity Rate` | Per-sprint velocity rate and rolling average as available |
| Workstream | `Overhead %` | Per-sprint overhead % and rolling average as available |
| Workstream | `Carry-Over %` | Per-sprint carry-over % and rolling average as available |

Workstream `Delivery/Bug` is excluded from v1 even though the tile exists in the current branch.

### Modal Content

Each modal should show:

- Metric title and scope label.
- Current tile value or aggregate value.
- Metric definition hint content or a visible link/inline explanation aligned with
  `lib/metrics/definitions.ts`.
- Rolling window label when available.
- Per-sprint rows in chronological display order matching existing chart and tab conventions.
- Raw sprint value and rolling average where both are meaningful for the metric.
- RAG status when the tile has one; rows do not need per-row RAG unless already available.

### State Catalog

- **Populated:** Shows the summary value and one row per trend sprint.
- **Empty history:** Shows an empty-state message explaining that there is not enough sprint
  history yet.
- **Partial history:** Shows available sprints only; do not pad missing sprints.
- **Null metric value:** Shows `N/A` in the affected cell with no crash.
- **Delivery-to-bug zero-bug case:** Preserve existing display rules for the aggregate and rows.
- **Dashboard error:** Existing dashboard error state remains responsible; the modal does not add
  a separate fetch failure state unless implementation chooses lazy loading.

### Accessibility and Interaction

- Tile affordances must be reachable by keyboard and have clear accessible labels.
- Opening and closing the modal should follow Mantine `Modal` focus management.
- Tooltip triggers for metric definitions and RAG badges must remain usable.
- A non-clickable tile should not look clickable; only supported metrics receive the affordance.

### Responsive Behavior

- On desktop, use a table or table-like layout that makes sprint-by-sprint comparison easy.
- On narrow screens, allow horizontal scroll or switch to stacked row cards inside the modal.
- Keep modal sizing consistent with existing dashboard modals (`lg` or `xl`, centered where it
  matches local patterns).

## Implementation Approach

1. Extend dashboard types with a modal-ready rolling metric model, or add narrowly scoped fields to
   existing trend sprint types.
2. Extend the metrics API and adapter for program-level delivery-to-bug sprint rows. Prefer
   additive fields and do not change existing tile response shapes.
3. Create `RollingMetricDetailModal` in `components/Dashboard/`, following established Mantine modal
   patterns.
4. Add a small tile affordance/wrapper that can be reused by program cards and workstream metric
   rows.
5. Wire supported program and workstream metrics to modal state in their existing components.
6. Add focused tests for adapter mapping, modal rendering, keyboard opening, null values, and the
   program-only delivery-to-bug decision.

## Related Specs

- `.writ/specs/2026-06-04-delivery-to-bug-ratio-metric/spec.md` is complete and defines the
  aggregate delivery-to-bug calculation and zero-bug rules.
- `.writ/specs/2026-06-04-prev-sprint-tabs-full-rolling-window/spec.md` is complete and defines
  anchored rolling-window behavior.
- `.writ/specs/2026-06-05-five-sprint-window-visible-tabs/spec.md` is complete and defines the sync
  backing depth for visible rolling windows.
- `.writ/specs/2026-05-18-metric-definition-tooltips/spec.md` is complete and defines the tooltip
  patterns this modal should reuse.

No active cross-spec conflict was detected for this scope.
