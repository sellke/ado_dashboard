# Overhead Sprint-Selectable ADO Links Specification

> Created: 2026-03-05
> Status: Complete
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Extend the overhead items section to show bugs, spikes, and support per sprint (driven by the shared SprintTabSelector) with clickable ADO links.

**Must Include:** Per-sprint overhead items (bugs, spikes, support) for the rolling 5-sprint window, driven by the shared sprint selector. Each item is a clickable `Anchor` linking to its ADO work item using the existing `buildAdoWorkItemUrl`.

**Hardest Constraint:** The API response shape changes from flat `currentSprintOverheadItems` (single sprint, 2 categories) to `overheadItemsBySprint` (5 sprints, 3 categories), requiring coordinated changes across the API route, types, adapter, view models, and component tree.

**Success Criteria:**

- Selecting a sprint in the shared tab selector updates overhead items to show that sprint's bugs, spikes, and support
- Every item row is a clickable link opening the ADO work item in a new browser tab
- Empty categories show a "No X items" message
- Closed items retain the line-through styling
- Spikes appear as a new group between Bugs and Support

**Scope Boundaries:**

- Included: API extension, spikes data, per-sprint overhead items, ADO links, updated tests
- Excluded: Category sub-tabs within overhead (shown as grouped sections), overhead composition chart changes, new sync/pipeline changes (spikes already synced)

## Detailed Requirements

### Backend: API Response Restructuring

The metrics API route (`app/api/metrics/route.ts`) already fetches `trendBugs`, `trendSpikes`, and `trendSupport` for the rolling 5-sprint window via Prisma queries. Currently, only current-sprint bugs/support are serialized into the response as `currentSprintOverheadItems`. This must be expanded to:

1. Include **all rolling sprints** (not just the current sprint)
2. Add **spikes** as a third category
3. Restructure from `{ bugs, support }` to an array of per-sprint objects: `{ sprintId, bugs, spikes, support }`

The spike item shape matches bugs/support: `{ adoId: number, title: string, state: string, hours: number | null }` where `hours = completedWork ?? originalEstimate ?? null`.

### Types: New Interfaces

- `ApiOverheadItemsBySprint` — per-sprint grouping in the API response
- `OverheadSprintViewModel` — per-sprint grouping in the view model layer
- `OverheadItemViewModel.adoUrl` — new field for the constructed ADO work item URL
- `WorkstreamCardViewModel` replaces `currentSprintBugItems` / `currentSprintSupportItems` with `overheadItemsBySprint: OverheadSprintViewModel[]`

### Adapter: Mapping + ADO URLs

- `mapOverheadItem` gains `adoUrl` via `buildAdoWorkItemUrl(item.adoId)` (from `lib/ado/urls.ts`)
- New mapping logic iterates `overheadItemsBySprint` from the API and maps all 3 categories per sprint
- The `adoId` field is formatted as `#123` for display; the numeric `adoId` from the API is used for URL construction

### UI Components

**`WorkstreamHealthCard`** — passes `activeSprintId` (already available from props) and `card.overheadItemsBySprint` to `OverheadBreakdownPanel`. Updates `hasOverheadData` check.

**`OverheadBreakdownPanel`** — new props: `activeSprintId: string` and `overheadItemsBySprint: OverheadSprintViewModel[]`. Replaces `bugItems` / `supportItems`. Finds the selected sprint's items and passes them to `CurrentSprintItemTables`.

**`CurrentSprintItemTables`** — adds `spikeItems` prop. Renders three grouped sections: Bugs, Spikes, Support. Each item becomes a Mantine `Anchor` with `href={item.adoUrl}` and `target="_blank"`, preserving existing styling (line-through for closed, truncate, `size="xs"`).

## Implementation Approach

### Data Flow

```
GET /api/metrics
  → API route builds overheadItemsBySprint[] (all 5 sprints × 3 categories)
  → adapter maps to OverheadSprintViewModel[] with adoUrl on each item
  → WorkstreamCardViewModel.overheadItemsBySprint
  → WorkstreamHealthCard receives activeSprintId (from SprintTabSelector)
  → OverheadBreakdownPanel looks up items for activeSprintId
  → CurrentSprintItemTables renders grouped sections with clickable links
```

### Patterns to Reuse

- `buildAdoWorkItemUrl` from `lib/ado/urls.ts` (already used by sprint stories)
- Mantine `Anchor` pattern from `SprintStoryListPanel` for clickable ADO links
- `SprintStoryListPanel` pattern for `activeSprintId` lookup: receive all sprints, find selected
- `OverheadItemViewModel` shape (extended with `adoUrl`)

### Key Decisions

- **No new API endpoint needed** — the metrics API already fetches all required data
- **No category sub-tabs** — Bugs, Spikes, Support shown as grouped sections
- **Sprint selection via shared SprintTabSelector** — not a separate selector
- **Spikes use `storyPoints` for hours** (matching existing overhead breakdown calculation)
