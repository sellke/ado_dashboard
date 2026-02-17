# Program Dashboard UI Specification

> Created: 2026-02-12
> Status: In Progress (Change Request)
> Contract Locked: Yes
> Last Updated: 2026-02-16

## Contract Summary

**Deliverable:** A Mantine-based Program Dashboard that now includes sprint-trend analytics (4-sprint actuals + Sprint 5 velocity prediction), while preserving existing summary, workstream health cards, and sync behavior.

**Must Include:**
- Program summary section with key health indicators for the selected sprint
- Program-level 4-sprint averages and explicit Sprint 1-4 trend rows
- Predicted Sprint 5 velocity only, clearly labeled as predicted
- Sprint-scoped velocity and velocity rate across four sprints
- Sprint-scoped `active bugs` and `bugs closed` across four sprints
- Five workstream health cards (Streams, Action Tracker, Pitch Tracker, KPI Services, UCM)
- Single-action `Sync Now` control that triggers full ADO rolling-window refresh
- Automatic metrics refresh after sync completion so dashboard values update without manual reload
- Loading, empty, and error states for dashboard reliability

**Hardest Constraint:** Trend and bug metrics must be computed in a backend metric-calculation layer using existing work-item and capacity rules; the UI may format and render only.

**Success Criteria:**
- Dashboard renders trend data from `GET /api/metrics` without client-side business-metric recomputation
- Program summary clearly shows 4-sprint average context and Sprint 5 velocity prediction
- Workstream views show Sprint 1-4 velocity, velocity rate, active bugs, and bugs closed
- Velocity-rate and prediction formulas are applied consistently with existing work-type hour derivation rules
- Bug counts include only bugs assigned to the sprint being displayed
- Existing sync, loading, empty, and error UX remains stable

**Scope Boundaries:**
- **Included:** Program summary UI, workstream health cards, trend and bug metric rendering, metric calculation service/layer, API contract update, state handling, Mantine composition, tests/stories
- **Excluded:** Transcript intelligence, milestone CRUD UI, pptx export implementation

---

## Detailed Requirements

## 1) UX Goals

- Give product and engineering leadership a quick sprint health read in under one minute.
- Make trends visible, not just current-state metric tiles.
- Keep visual hierarchy and spacing compatible with future export-to-slide requirements.

## 2) Metric Definitions (Locked)

- **Velocity (Sprint 1-4 actual):** Done-like story points assigned to that workstream and sprint.
- **Velocity Rate (Sprint 1-4 actual):**
  - Numerator: done-like story points in that workstream sprint
  - Denominator: net capacity hours in that workstream sprint
  - `velocityRate = doneLikeStoryPoints / netCapacityHours`
- **Net Capacity Hours:**
  - `total hours - overhead - bug hours - spike hours - support hours`
  - Work-type hour derivation must reuse the existing rules already used by metric calculators.
- **Predicted Velocity (Sprint 5 only):**
  - `average velocity rate × current sprint net capacity hours`
  - Show as predicted value and keep distinct from actuals.
- **Bugs Closed (Sprint 1-4):** Bug items in done-like states (`Closed`, `Done`, `Resolved`) assigned to that sprint.
- **Active Bugs (Sprint 1-4):** Bug items in non-done-like states assigned to that sprint.

## 3) Page Composition

### Program Summary Section
- Displays selected sprint name and `computedAt` freshness.
- Shows existing program-level metric tiles and RAG indicators.
- Adds a trend strip/table for Sprint 1-4:
  - Velocity
  - Velocity rate
  - Active bugs
  - Bugs closed
- Shows Sprint 5 predicted velocity only, with explicit predicted labeling.
- Includes lightweight context text for empty values (for example, missing capacity data).

### Workstream Health Cards
- Render one card per workstream in a responsive grid.
- Each card keeps the existing metric presentation.
- Each card adds per-sprint trend values (Sprint 1-4) for:
  - Velocity
  - Velocity rate
  - Active bugs
  - Bugs closed
- Cards must remain legible at common laptop widths and in Storybook viewport presets.

## 4) Data and State Handling

- Primary data source: `GET /api/metrics` with default latest sprint behavior.
- Dashboard consumes extended response blocks for trend and bug series.
- Sync action source: `POST /api/sync/ado` (full refresh only for this dashboard control).
- Required states:
  - Loading skeletons/placeholders
  - Empty state when API returns no snapshots
  - Error alert with retry affordance
  - Partial-data state when some sprint trend values are unavailable
- Sync-specific states:
  - Sync in progress (button disabled and progress feedback visible)
  - Sync success (non-blocking confirmation)
  - Sync failure (non-blocking error with retry option)
- UI must tolerate null metric values and render explicit placeholders such as `N/A`.

## 5) Sync Trigger Interaction Rules

- Place a single `Sync Now` action in the dashboard shell/header region.
- Clicking the action immediately triggers full sync; no confirmation modal is shown.
- While sync runs, prevent duplicate submissions with disabled/locked control state.
- On sync completion, automatically refetch `GET /api/metrics` and re-render with latest values.
- If sync succeeds but metrics refetch fails, surface clear partial-success messaging.

## 6) Testing and Documentation

- Unit tests verify metric-calculation service behavior for:
  - velocity rate denominator handling
  - sprint assignment constraints for bug counts
  - Sprint 5 prediction formula
  - missing net-capacity edge cases
- API tests verify trend and bug payload structure and compatibility with existing fields.
- Component tests verify rendering for:
  - full trend data
  - partial trend data
  - no trend data
  - error fallback
- Storybook stories include at least:
  - healthy trend snapshot
  - mixed missing-data trend snapshot
  - predicted velocity present
  - sync in-progress and sync failed states

---

## Story Plan

1. `story-1-dashboard-data-contract-and-shell.md`: Dashboard shell, data fetch wiring, and global state handling. Dependencies: None.
2. `story-2-program-summary-section.md`: Program summary layout, metric tiles, freshness and fallback UX. Dependencies: Story 1.
3. `story-3-workstream-health-cards.md`: Responsive card grid and workstream metric presentation. Dependencies: Story 1.
4. `story-4-dashboard-state-coverage-and-storybook.md`: Error/empty/loading polish, tests, and Storybook coverage. Dependencies: Stories 1-3.
5. `story-5-dashboard-sync-trigger-and-auto-refresh.md`: Single-action sync control, immediate execution, and automatic post-sync metrics refresh. Dependencies: Story 1, Story 4.
6. `story-6-metric-calculation-service-and-trend-api.md`: Introduce metric-calculation service/layer for trend, velocity rate, bug metrics, and Sprint 5 velocity prediction; expose API payload extensions. Dependencies: Story 1.
7. `story-7-trend-and-bug-metrics-ui-integration.md`: Render trend rows and bug counts in program summary and workstream cards with robust state handling. Dependencies: Stories 2, 3, 4, 6.

## Implementation Approach

- Add/extend a dedicated backend metric-calculation service/layer to compute trend-series values.
- Keep API calls and response transformation in a small UI data adapter layer.
- Reuse existing work-type hour derivation and done-like state logic to avoid formula drift.
- Preserve backward compatibility in `GET /api/metrics` by extending, not replacing, existing fields.
- Maintain strict separation: backend owns metric computation; frontend renders and formats only.
