# Sprint Story List — Spec Lite

> For AI context windows. See `spec.md` for full details.

## What

Per-workstream panel below VelocityTrendChart showing User Stories grouped by status, with Mantine Tabs for sprint selection (5-sprint rolling window, current sprint default).

## Story Row Fields

Title, assignee, story points, state. Clicking row opens ADO work item.

## Status Groups

- **Planned:** New, Approved, Committed
- **Active:** Active
- **Resolved:** Resolved
- **Completed:** Closed

Removed/unknown states excluded. Empty groups hidden.

## API

`GET /api/sprints/stories?workstreamId={id}` — Returns User Stories grouped by sprint and status from the rolling 5-sprint window.

## New Components

- `SprintStoryListPanel` — Mantine Tabs + grouped story list
- `sprint-stories-adapter.ts` — API → view model mapping

## Modified

- `types.ts` — New VM types (`SprintStoryViewModel`, `StoryRowViewModel`)
- `WorkstreamHealthCard` — Renders `SprintStoryListPanel` below velocity chart
- `DashboardContainer` — Fetches sprint stories, passes to cards

## ADO Link Pattern

`https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/{adoId}`

## Out of Scope

Story editing, drag-and-drop, real-time updates, non-UserStory types, detail modals.
