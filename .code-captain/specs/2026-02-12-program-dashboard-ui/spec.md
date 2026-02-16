# Program Dashboard UI Specification

> Created: 2026-02-12
> Status: Planning
> Contract Locked: Yes

## Contract Summary

**Deliverable:** A Mantine-based Program Dashboard that displays a program-level summary and per-workstream health cards using computed sprint metrics from the existing backend APIs.

**Must Include:**
- Program summary section with key health indicators for the selected sprint
- Four workstream health cards (Streams, Action Tracker, Pitch Tracker, KPI Services + UCM)
- RAG-driven visual status for velocity, overhead percent, predictability, and carry-over rate
- Single-action "Sync Now" control that triggers a full ADO rolling-window refresh
- Automatic metrics refresh after sync completion so dashboard values update without manual reload
- Loading, empty, and error states for dashboard reliability
- Layout and interaction design ready for follow-on PowerPoint export work

**Hardest Constraint:** The UI must present complex metric detail and RAG status clearly without introducing client-side metric calculation or conflicting with existing API response contracts.

**Success Criteria:**
- Dashboard renders data from `GET /api/metrics` without client-side recomputation
- Program summary and all workstream cards are visible and readable in one dashboard view
- Operator can trigger full sync directly from dashboard with one click (no confirmation dialog)
- Dashboard automatically refetches metrics after sync completes
- Empty/error states are actionable and do not break page layout
- Storybook stories and component tests cover major UI states

**Scope Boundaries:**
- **Included:** Program summary UI, workstream health cards, metric formatting, state handling, Mantine composition, tests/stories
- **Excluded:** New backend metric formulas, transcript intelligence, milestone CRUD UI, pptx export implementation

---

## Detailed Requirements

## 1) UX Goals

- Give product and engineering leadership a quick sprint health read in under one minute.
- Make program-level status obvious first, then allow comparison across workstreams.
- Keep visual hierarchy and spacing compatible with future export-to-slide requirements.

## 2) Page Composition

### Program Summary Section
- Displays selected sprint name and `computedAt` freshness.
- Shows program-level metrics (velocity, overhead percent, predictability, carry-over rate).
- Uses color-coded status badges/chips from API-provided RAG values.
- Includes lightweight context text for empty values (for example, no planned points).

### Workstream Health Cards
- Render one card per workstream in a responsive grid.
- Each card shows:
  - Workstream name
  - 4 core metrics with value, RAG, and optional rolling average
  - Supporting detail values where useful (planned/completed points, carry-over items)
- Cards must remain legible at common laptop widths and in Storybook viewport presets.

## 3) Data and State Handling

- Primary data source: `GET /api/metrics` with default latest sprint behavior.
- Optional sprint targeting: support query-driven sprint selection in UI state if provided.
- Sync action source: `POST /api/sync/ado` (full refresh only for this dashboard control).
- Required states:
  - Loading skeletons/placeholders
  - Empty state when API returns no snapshots
  - Error alert with retry affordance
- Sync-specific states:
  - Sync in progress (button disabled and progress feedback visible)
  - Sync success (non-blocking confirmation)
  - Sync failure (non-blocking error with retry option)
- UI must tolerate null metric values and render an explicit placeholder such as `N/A`.

## 4) Sync Trigger Interaction Rules

- Place a single "Sync Now" action in the dashboard shell/header region.
- Clicking the action immediately triggers full sync; no confirmation modal is shown.
- While sync runs, prevent duplicate submissions with disabled/locked control state.
- On sync completion, automatically refetch `GET /api/metrics` and re-render with latest values.
- If sync succeeds but metrics refetch fails, surface clear partial-success messaging.

## 5) Formatting and Visual Rules

- Metric labels remain consistent with backend naming:
  - Velocity
  - Overhead %
  - Predictability %
  - Carry-over %
- Percentage metrics display fixed precision suitable for dashboards.
- RAG colors align with shared theme tokens to avoid hardcoded color drift.

## 6) Testing and Documentation

- Component tests verify rendering for:
  - Full data payload
  - Empty payload
  - Error fallback
  - Null metric fields
- Integration tests verify:
  - Sync action triggers `POST /api/sync/ado`
  - Sync control is disabled while request is in flight
  - Metrics auto-refetch runs after sync completion
  - Sync failure and post-sync refetch failure are communicated clearly
- Storybook stories include at least:
  - Healthy program snapshot
  - Mixed RAG statuses
  - No data state
  - Sync in-progress state
  - Sync failed state
- README/docs references updated to point to new dashboard modules.

---

## Story Plan

1. `story-1-dashboard-data-contract-and-shell.md`: Dashboard shell, data fetch wiring, and global state handling. Dependencies: None.
2. `story-2-program-summary-section.md`: Program summary layout, metric tiles, freshness and fallback UX. Dependencies: Story 1.
3. `story-3-workstream-health-cards.md`: Responsive card grid and workstream metric presentation. Dependencies: Story 1.
4. `story-4-dashboard-state-coverage-and-storybook.md`: Error/empty/loading polish, tests, and Storybook coverage. Dependencies: Stories 1-3.
5. `story-5-dashboard-sync-trigger-and-auto-refresh.md`: Single-action sync control, immediate execution, and automatic post-sync metrics refresh. Dependencies: Story 1, Story 4.

## Implementation Approach

- Build dashboard UI from composable Mantine components under `components/`.
- Keep API calls and response transformation in a small UI data adapter layer.
- Reuse existing theme primitives and avoid introducing a second status-color mapping.
- Maintain strict separation: backend owns metric computation; frontend only renders.
