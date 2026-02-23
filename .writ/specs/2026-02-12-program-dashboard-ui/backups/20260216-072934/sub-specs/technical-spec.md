# Program Dashboard UI - Technical Specification

> Created: 2026-02-12
> Depends on: Metric Engine API (`GET /api/metrics`)

## Architecture Overview

The dashboard uses a presentation-first architecture:
- A thin data adapter fetches and normalizes API data.
- Presentational components render summary and workstream views.
- Shared formatting/status helpers ensure consistency across sections.

No metric math is performed in the UI layer.

## Module Design

| Module | Responsibility | DB Access? |
|---|---|---|
| Dashboard page/container | Trigger fetch and route state to sections | No |
| Data adapter | Transform API payload into view models | No |
| Program summary component | Render program-level metrics and freshness metadata | No |
| Workstream card component | Render per-workstream metrics and details | No |
| Formatting helpers | Percent/number formatting and null placeholders | No |
| RAG display helper | Map RAG label to themed visual token | No |

## Proposed UI Composition

```
DashboardPage
  -> DashboardShell (loading/error/empty handling)
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
3. Components render from view models only.

## State Model

- `loading`: show skeletons for summary and cards.
- `success`: render summary + card grid.
- `empty`: render empty-state copy with consistent page structure.
- `error`: render error alert and retry action.

## Design Constraints

- Keep dashboard export-friendly (stable spacing, predictable card dimensions).
- Use Mantine theming and avoid inline hardcoded colors.
- Keep metric label and unit naming aligned with API contract.
- Ensure deterministic workstream ordering for repeatable stakeholder scans.

## Testing Strategy

- Adapter tests for payload normalization and null handling.
- Component tests for all state variants.
- Storybook stories as visual regression anchors:
  - Healthy snapshot
  - Mixed RAG snapshot
  - Empty state
  - Error state

## Risks and Mitigations

1. **Risk:** API contract drift causes runtime rendering issues.  
   **Mitigation:** Centralize response mapping in adapter and unit test it.

2. **Risk:** Visual inconsistency between summary and card metrics.  
   **Mitigation:** Shared format and RAG display helpers.

3. **Risk:** Null-heavy payloads degrade readability.  
   **Mitigation:** Explicit placeholders and stable tile/card layout.
