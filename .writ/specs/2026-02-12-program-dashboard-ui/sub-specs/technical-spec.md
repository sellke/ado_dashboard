# Program Dashboard UI - Technical Specification

> Created: 2026-02-12
> Updated: 2026-02-16 (Change Request)
> Depends on: Metric Engine API (`GET /api/metrics`)

## Architecture Overview

The dashboard now uses a split architecture:
- Backend metric-calculation service/layer computes trend and bug metrics.
- API route assembles additive response blocks for UI consumption.
- A thin UI adapter normalizes payload into dashboard view models.
- Presentational components render summary and workstream views.
- Sync action handler triggers full sync and post-sync refetch.

No business metric math is performed in the UI layer.

## Module Design

| Module | Responsibility | DB Access? |
|---|---|---|
| Metric calculation service/layer | Compute velocity rate, net capacity, bug metrics, and Sprint 5 prediction | Yes |
| Metrics API route | Return current metrics plus trend/prediction blocks | Yes |
| Dashboard page/container | Trigger fetch and route state to sections | No |
| Data adapter | Transform API payload into view models | No |
| Sync action handler | Trigger `POST /api/sync/ado` and coordinate post-sync refetch | No |
| Program summary component | Render program metrics, trends, and prediction | No |
| Workstream card component | Render per-workstream metrics, trends, and bug counts | No |
| Formatting helpers | Percent/number formatting and null placeholders | No |

## Proposed UI Composition

```
DashboardPage
  -> DashboardShell (loading/error/empty handling)
      -> SyncNowAction
      -> ProgramSummarySection
         -> MetricTiles
         -> TrendTable (Sprint 1-4)
         -> PredictedVelocity (Sprint 5)
      -> WorkstreamCardsGrid
          -> WorkstreamHealthCard (x4)
             -> CoreMetrics
             -> WorkstreamTrendRows (Sprint 1-4)
```

## Data Flow

1. Shell requests `GET /api/metrics`.
2. API route invokes metric-calculation service for trend/prediction blocks.
3. Adapter maps response into:
   - `summaryViewModel`
   - `workstreamCardViewModels[]`
   - `trendViewModels`
   - `viewState` (loading, success, empty, error)
4. `Sync Now` requests `POST /api/sync/ado`.
5. On sync completion, shell requests `GET /api/metrics` again.
6. Components render from view models only.

## Formula Contracts

- `velocityRate = doneLikeStoryPoints / netCapacityHours`
- `netCapacityHours = totalHours - overhead - bugHours - spikeHours - supportHours`
- `predictedVelocitySprint5 = averageVelocityRate * currentSprintNetCapacityHours`
- `bugsClosed`: sprint-assigned bugs in done-like states (`Closed|Done|Resolved`)
- `activeBugs`: sprint-assigned bugs not in done-like states

## State Model

- `loading`: show skeletons for summary and cards.
- `success`: render summary + trend + card grid.
- `partial`: render available trend data with placeholders for missing values.
- `empty`: render empty-state copy with consistent page structure.
- `error`: render error alert and retry action.
- `syncing`: keep existing dashboard content visible, lock sync action, and show progress feedback.
- `syncFailed`: show non-blocking sync error while preserving last known dashboard data.

## Design Constraints

- Keep dashboard export-friendly (stable spacing, predictable card dimensions).
- Use Mantine theming and avoid inline hardcoded colors.
- Keep metric label and unit naming aligned with API contract.
- Ensure deterministic workstream ordering and sprint ordering for trend scanning.

## Testing Strategy

- Calculator tests for velocity rate, net capacity, bug metrics, and prediction.
- API tests for additive payload contract and null handling.
- Adapter tests for trend normalization and fallback mapping.
- Component tests for all state variants including partial trend data.
- Storybook stories as visual regression anchors:
  - Healthy trend snapshot
  - Mixed data availability
  - Empty state
  - Error state
  - Sync in-progress state
  - Sync failure state

## Risks and Mitigations

1. **Risk:** Formula drift across modules.  
   **Mitigation:** Centralize calculations in a dedicated service/layer with locked tests.

2. **Risk:** Capacity data quality causes unstable velocity-rate values.  
   **Mitigation:** Enforce explicit null/zero denominator handling and visible placeholders.

3. **Risk:** Added trend density hurts readability.  
   **Mitigation:** Compact, labeled trend rows and strict spacing checks in Storybook.
