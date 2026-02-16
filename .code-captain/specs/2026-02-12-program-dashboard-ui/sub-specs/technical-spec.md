# Program Dashboard UI - Technical Specification

> Created: 2026-02-12
> Depends on: Metric Engine API (`GET /api/metrics`)

## Architecture Overview

The dashboard uses a presentation-first architecture:
- A thin data adapter fetches and normalizes API data.
- A dashboard action handler triggers full sync and then refreshes dashboard metrics.
- Presentational components render summary and workstream views.
- Shared formatting/status helpers ensure consistency across sections.

No metric math is performed in the UI layer.

## Module Design

| Module | Responsibility | DB Access? |
|---|---|---|
| Dashboard page/container | Trigger fetch and route state to sections | No |
| Data adapter | Transform API payload into view models | No |
| Sync action handler | Trigger `POST /api/sync/ado` and coordinate post-sync refetch | No |
| Program summary component | Render program-level metrics and freshness metadata | No |
| Workstream card component | Render per-workstream metrics and details | No |
| Formatting helpers | Percent/number formatting and null placeholders | No |
| RAG display helper | Map RAG label to themed visual token | No |

## Proposed UI Composition

```
DashboardPage
  -> DashboardShell (loading/error/empty handling)
      -> SyncNowAction
      -> ProgramSummarySection
      -> WorkstreamCardsGrid
          -> WorkstreamHealthCard (x4)
```

## Data Flow

1. Shell requests `GET /api/metrics`.
2. Adapter maps response into:
   - `summaryViewModel`
   - `workstreamCardViewModels[]`
   - `viewState` (loading, success, empty, error)
3. "Sync Now" requests `POST /api/sync/ado`.
4. On sync completion, shell requests `GET /api/metrics` again.
5. Components render from view models only.

## State Model

- `loading`: show skeletons for summary and cards.
- `success`: render summary + card grid.
- `empty`: render empty-state copy with consistent page structure.
- `error`: render error alert and retry action.
- `syncing`: keep existing dashboard content visible, lock sync action, and show progress feedback.
- `syncFailed`: show non-blocking sync error while preserving last known dashboard data.

## Design Constraints

- Keep dashboard export-friendly (stable spacing, predictable card dimensions).
- Use Mantine theming and avoid inline hardcoded colors.
- Keep metric label and unit naming aligned with API contract.
- Ensure deterministic workstream ordering for repeatable stakeholder scans.

## Testing Strategy

- Adapter tests for payload normalization and null handling.
- Component tests for all state variants.
- Integration tests for sync click -> sync in-flight -> auto-refresh completion.
- Storybook stories as visual regression anchors:
  - Healthy snapshot
  - Mixed RAG snapshot
  - Empty state
  - Error state
  - Sync in-progress state
  - Sync failure state

## Risks and Mitigations

1. **Risk:** API contract drift causes runtime rendering issues.  
   **Mitigation:** Centralize response mapping in adapter and unit test it.

2. **Risk:** Visual inconsistency between summary and card metrics.  
   **Mitigation:** Shared format and RAG display helpers.

3. **Risk:** Null-heavy payloads degrade readability.  
   **Mitigation:** Explicit placeholders and stable tile/card layout.
