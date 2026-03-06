# Sprint Story List with Tabbed Status Filtering

> Created: 2026-03-05
> Status: Planning
> Contract Locked: ✅

## Contract Summary

**Deliverable:** A per-workstream sprint story list panel with Mantine tab-based sprint switching, showing User Stories grouped by status sections (Planned, Active, Resolved, Completed), with clickable rows linking to ADO.

**Must Include:** Sprint tabs for the rolling 5-sprint window (matching the existing trend data), defaulting to the current sprint, with story rows showing title, assignee, story points, and current state.

**Hardest Constraint:** The `GET /api/metrics` route already returns trend data but not individual work items. A new API endpoint is needed to return User Stories grouped by sprint + workstream + status without duplicating existing metric calculation logic.

**Success Criteria:**

- Each workstream card shows a story list panel beneath the velocity chart
- Users can tab between 5 sprints and see stories grouped by status
- Story rows display title, assignee, story points, state, and link to ADO
- Default tab is the current sprint
- Empty states handled gracefully (sprints with no stories)

**Scope Boundaries:**

- Included: Sprint story list UI, new API route for sprint stories, adapter/view-model layer, status-section grouping, ADO deep links
- Excluded: Story editing, drag-and-drop state changes, real-time updates, non-UserStory work item types, story detail modals

## Detailed Requirements

### Data Requirements

Work items are already stored in the `WorkItem` table with `sprintId` and `workstreamId` foreign keys. The query filters:

- `type = 'UserStory'`
- `workstreamId` matches the workstream card
- `sprintId` in the rolling 5-sprint window

Each story row displays:

| Field | Source | Notes |
|-------|--------|-------|
| Title | `WorkItem.title` | Primary display text |
| Assignee | `WorkItem.assignedTo` | Person display name |
| Story Points | `WorkItem.storyPoints` | Numeric, nullable |
| State | `WorkItem.state` | Raw ADO state |
| ADO Link | `WorkItem.adoId` | Deep link to ADO work item |

### Status Mapping (ADO → Display Groups)

| Display Group | ADO States | Visual Treatment |
|---------------|------------|-----------------|
| **Planned** | New, Approved, Committed | Gray/neutral section |
| **Active** | Active | Blue/accent section |
| **Resolved** | Resolved | Amber/warning section |
| **Completed** | Closed | Green/success section |

Stories with states not matching any group (e.g., Removed) are excluded from the list.

### Sprint Selection

- Mantine `Tabs` component with one tab per sprint
- Rolling window of 5 sprints from the existing trend data
- Tabs display sprint name (e.g., "Sprint 2025.12")
- Default/active tab is the current sprint (determined by date range or most recent)
- Sprint order: newest first (left to right, current sprint leftmost)

### ADO Deep Links

URL pattern: `https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/{adoId}`

Clicking a story row opens the ADO work item in a new tab.

### Empty States

- Sprint with no User Stories: "No user stories in this sprint"
- Status group with no stories: Group section is hidden (not shown)
- Workstream with no sprint data: Panel is hidden entirely

### Component Placement

The panel renders **directly below the `VelocityTrendChart`** inside each `WorkstreamHealthCard`. It sits above the existing `OverheadBreakdownPanel`.

## Implementation Approach

### Architecture

```
GET /api/sprints/stories?workstreamId={id}
  → Prisma query: WorkItem (type=UserStory) joined with Sprint
  → Returns: { sprints: [{ id, name, isCurrent, stories: [...] }] }

DashboardContainer
  → Fetches sprint stories per workstream (lazy or upfront)
  → Passes to WorkstreamHealthCard

WorkstreamHealthCard
  → SprintStoryListPanel (new component)
       → Mantine Tabs (sprint selection)
       → Status-grouped story rows with ADO links
```

### New Files

| File | Purpose |
|------|---------|
| `app/api/sprints/stories/route.ts` | API endpoint for sprint stories |
| `components/Dashboard/SprintStoryListPanel.tsx` | Panel component with tabs + grouped list |
| `lib/dashboard/sprint-stories-adapter.ts` | Maps API response to view models |

### Modified Files

| File | Change |
|------|--------|
| `lib/dashboard/types.ts` | Add `SprintStoryViewModel`, `StoryRowViewModel`, `SprintStoriesResponse` types |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Add `SprintStoryListPanel` below velocity chart |
| `components/Dashboard/DashboardContainer.tsx` | Fetch sprint stories data, pass to workstream cards |

### Testing Strategy

- **API route tests:** Query filtering, status mapping, sprint ordering
- **Adapter tests:** View model mapping, empty states, status grouping
- **Component tests:** Tab switching, story row rendering, ADO link construction, empty states
- **Integration:** Panel renders within workstream card with real-shaped data
