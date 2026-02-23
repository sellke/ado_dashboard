# Program Dashboard UI - Wireframe Notes

> Created: 2026-02-12
> Fidelity: Low (structure and hierarchy, not final visual design)

## Layout Blueprint

```
+--------------------------------------------------------------+
| Program Dashboard                                            |
| Sprint: Sprint 26.21           [Sync Now]    Updated: 9:42am |
+--------------------------------------------------------------+
| Program Summary                                              |
| [Velocity] [Overhead %] [Predictability %] [Carry-over %]   |
|  128 G      31.2 A         82.0 G             12.0 A        |
+--------------------------------------------------------------+
| Workstream Health                                            |
| +-------------------+  +-------------------+                |
| | Streams           |  | Action Tracker    |                |
| | Vel: 34  G        |  | Vel: 22  A        |                |
| | Ovh: 28% G        |  | Ovh: 35% A        |                |
| | Pred: 85% G       |  | Pred: 74% A       |                |
| | Carry: 9% G       |  | Carry: 19% A      |                |
| | Planned: 40       |  | Planned: 28       |                |
| +-------------------+  +-------------------+                |
| +-------------------+  +-------------------+                |
| | Pitch Tracker     |  | KPI Services+UCM  |                |
| | ...               |  | ...               |                |
| +-------------------+  +-------------------+                |
+--------------------------------------------------------------+
```

## Section Behavior

### Header Row
- Title: `Program Dashboard`
- Sprint context: current or selected sprint name
- Sync action: single "Sync Now" button for full data refresh
- Freshness: human-readable `computedAt`

### Program Summary
- Four horizontal metric tiles
- Each tile includes:
  - Metric label
  - Value
  - RAG indicator
  - Optional rolling average tooltip/subtext (if available)

### Workstream Grid
- 2x2 card layout on desktop
- 1-column stack on narrow viewports
- Standard card contents:
  - Workstream name
  - Four metric lines (value + RAG)
  - Compact detail row(s)

## State Wireframes

### Loading
- Skeleton tiles in summary area
- Skeleton cards in 2x2 grid

### Sync In Progress
- Existing dashboard data remains visible
- Sync button disabled with spinner/progress label
- Optional inline status text ("Sync in progress...")

### Empty
- Informational panel: no metric snapshots yet
- Optional action cue: run sync/compute workflow

### Error
- Alert panel with short diagnostic text
- Retry button near alert header

### Sync Error
- Non-blocking message near header action region
- Existing dashboard metrics remain visible
- "Sync Now" is re-enabled for retry

## Content Guidelines

- Keep labels short and consistent between summary and cards.
- Use `N/A` for null metrics, never blank cells.
- Prefer icon + text for RAG indicators to improve scanability.
