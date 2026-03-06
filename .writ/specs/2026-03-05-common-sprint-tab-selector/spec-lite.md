# Common Sprint Tab Selector — Spec Lite

> Context summary for AI assistants. Full spec: `spec.md`

## What

Replace four duplicate per-workstream sprint tab bars with a single shared sprint selector above the workstream cards grid. One tab change updates all cards.

## Key Decisions

- **Placement:** `WorkstreamCardsGrid` level (above the grid, below `ProgramSummarySection`)
- **State:** `useState<string>` in `WorkstreamCardsGrid`; no global store
- **Default:** Current sprint (`isCurrent === true`), fallback to first sprint
- **Sprint list source:** Derived from first non-empty workstream in `sprintStoriesMap` (all share same 5-sprint window)
- **UI pattern:** Mantine `Tabs` variant `"outline"` with story-count badges, matching existing style

## Component Changes

| Component | Change |
|---|---|
| `SprintTabSelector` (new) | Shared Mantine Tabs with sprint list, badges, controlled value/onChange |
| `SprintStoryListPanel` | Remove internal Tabs; accept `activeSprintId`; render single sprint's stories |
| `WorkstreamCardsGrid` | Add sprint state, derive sprint list, render `SprintTabSelector`, pass `activeSprintId` to cards |
| `WorkstreamHealthCard` | Forward `activeSprintId` to `SprintStoryListPanel` |

## Data Flow

```
DashboardContainer (fetches sprintStoriesMap)
→ DashboardShell
  → WorkstreamCardsGrid (derives sprint list, owns activeSprintId state)
    → SprintTabSelector (renders shared tabs)
    → WorkstreamHealthCard[] (each receives activeSprintId)
      → SprintStoryListPanel (renders single sprint's stories)
```

## Out of Scope

- Sprint API changes
- Global state management
- "Link all" toggle (tabs are always shared)
