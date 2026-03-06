# Common Sprint Tab Selector Specification

> Created: 2026-03-05
> Status: Done
> Contract Locked: ✅

## Contract Summary

**Deliverable:** A single shared sprint selector at the `WorkstreamCardsGrid` level that controls which sprint's stories are displayed across all four workstream cards simultaneously.

**Must Include:** One tab change updates all workstream story lists; current sprint selected by default; consistent Mantine UI.

**Hardest Constraint:** Deriving a unified sprint list from `sprintStoriesMap` (keyed per workstream) — need to merge/union sprints or derive from any non-empty workstream since the API returns the same rolling window.

**Success Criteria:** Users can compare stories across all workstreams for a single sprint with one click instead of four. No duplicate tab bars. Sprint selector visually cohesive with existing dashboard.

**Scope Boundaries:**

- Included: Shared sprint selector component, lifting state to `WorkstreamCardsGrid`, refactoring `SprintStoryListPanel` to accept controlled `activeSprint` prop, removing per-card tab bars
- Excluded: Changing the sprint API, adding a "link all" toggle (full replacement of per-card tabs), global state management (simple `useState` is sufficient)

## Detailed Requirements

### Current State

Each `WorkstreamHealthCard` renders its own `SprintStoryListPanel` with an independent set of Mantine `Tabs`. With four workstreams visible, this produces four duplicate tab bars showing the same five rolling sprints. A user who wants to compare sprint stories across workstreams must click the same tab in each card separately.

### Target State

A single sprint selector rendered above the workstream cards grid. Selecting a sprint updates all four workstream story lists simultaneously. Each card still shows its own stories for the selected sprint, but no longer renders its own tab bar.

### Functional Requirements

1. **Shared selector placement** — Rendered at the `WorkstreamCardsGrid` level, visually above the card grid.
2. **Controlled selection** — The selector owns a `useState<string>` for the active sprint ID. This value is passed down to each `WorkstreamHealthCard` → `SprintStoryListPanel`.
3. **Default to current sprint** — On initial render, the selector defaults to the sprint where `isCurrent === true`. Falls back to the first sprint if none is current.
4. **Unified sprint list** — The sprint list is derived from `sprintStoriesMap` by extracting sprints from the first workstream that has data. All workstreams share the same rolling 5-sprint window from the API, so no merge logic is needed under normal conditions. A defensive union could be added if sprint sets ever diverge.
5. **SprintStoryListPanel refactor** — The panel switches from uncontrolled (`defaultValue`) to controlled mode. It accepts `activeSprintId: string` and renders only that sprint's stories. The internal `Tabs` wrapper and `Tabs.List` are removed; the panel becomes a simple story list for a single sprint.
6. **Visual consistency** — The shared selector uses Mantine `Tabs` (or `SegmentedControl`) with `variant="outline"` to match existing UI patterns. Sprint badges (story count) are preserved on the shared tabs.

### Non-Functional Requirements

- No new API calls — uses existing `sprintStoriesMap` data already fetched by `DashboardContainer`.
- No global state library — local `useState` in `WorkstreamCardsGrid` is sufficient.
- Performance: Changing the selected sprint should feel instantaneous (client-side state swap, no network calls).

## Implementation Approach

### Architecture

```
WorkstreamCardsGrid
├── SprintTabSelector (new component, shared)
│   └── Mantine Tabs (value={activeSprintId}, onChange={setActiveSprintId})
└── Grid of WorkstreamHealthCards
    └── SprintStoryListPanel (controlled, shows single sprint)
```

### Key Components

| Component | Change Type | Description |
|---|---|---|
| `SprintTabSelector` | New | Shared Mantine Tabs rendering the sprint list with story-count badges |
| `SprintStoryListPanel` | Refactor | Remove internal Tabs; accept `activeSprintId` prop; render single sprint's status groups |
| `WorkstreamCardsGrid` | Modify | Add `useState` for active sprint; derive sprint list; render `SprintTabSelector`; pass `activeSprintId` to each card |
| `WorkstreamHealthCard` | Modify | Accept and forward `activeSprintId` to `SprintStoryListPanel` |

### Sprint List Derivation

```typescript
function deriveSprintList(
  sprintStoriesMap: Record<string, SprintStoryViewModel[]> | undefined
): SprintStoryViewModel[] {
  if (!sprintStoriesMap) return [];
  const firstWorkstreamSprints = Object.values(sprintStoriesMap).find(
    (sprints) => sprints.length > 0
  );
  return firstWorkstreamSprints ?? [];
}
```

### State Flow

1. `WorkstreamCardsGrid` calls `deriveSprintList(sprintStoriesMap)` to get the sprint list.
2. `useState` initializes to the `id` of the sprint where `isCurrent === true`.
3. `SprintTabSelector` renders tabs from the sprint list, controlled by `activeSprintId`.
4. Each `WorkstreamHealthCard` receives `activeSprintId` and finds the matching sprint in its own `sprintStories` array.
5. `SprintStoryListPanel` receives the single selected sprint's data and renders status groups + story rows.
