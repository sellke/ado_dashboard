# Overhead Sprint-Selectable ADO Links — Spec Lite

> Context-window-friendly summary for AI agents

## What

Extend overhead items (Bugs, Spikes, Support) to be:
1. **Sprint-selectable** — driven by the shared `SprintTabSelector` (rolling 5 sprints)
2. **Clickable** — each item links to its ADO work item via `buildAdoWorkItemUrl`
3. **Complete** — add Spikes as a new category alongside Bugs and Support

## Key Changes

### API (`app/api/metrics/route.ts`)
- Replace `currentSprintOverheadItems: { bugs, support }` with `overheadItemsBySprint: Array<{ sprintId, bugs, spikes, support }>`
- Data already fetched (`trendBugs`, `trendSpikes`, `trendSupport`); restructure output for all 5 sprints
- Spike item shape: `{ adoId, title, state, hours }` where hours = `completedWork ?? originalEstimate ?? null`

### Types (`lib/dashboard/types.ts`)
- Add `ApiOverheadItemsBySprint`, `OverheadSprintViewModel`
- Add `adoUrl: string` to `OverheadItemViewModel`
- Replace `currentSprintBugItems` / `currentSprintSupportItems` on `WorkstreamCardViewModel` with `overheadItemsBySprint: OverheadSprintViewModel[]`

### Adapter (`lib/dashboard/adapter.ts`)
- `mapOverheadItem` adds `adoUrl` via `buildAdoWorkItemUrl(item.adoId)`
- Map `overheadItemsBySprint` array (all 3 categories per sprint)

### Components
- `WorkstreamHealthCard` → passes `activeSprintId` + `overheadItemsBySprint` to panel
- `OverheadBreakdownPanel` → new props `activeSprintId`, `overheadItemsBySprint`; finds selected sprint
- `CurrentSprintItemTables` → adds `spikeItems`; items become `Anchor` links to ADO

## Patterns
- Reuse `buildAdoWorkItemUrl` from `lib/ado/urls.ts`
- Reuse `Anchor` pattern from `SprintStoryListPanel`
- Reuse `activeSprintId` lookup pattern from `SprintStoryListPanel`

## Scope
- In: API extension, spikes, per-sprint items, ADO links, tests
- Out: Category sub-tabs, overhead composition chart, sync changes
