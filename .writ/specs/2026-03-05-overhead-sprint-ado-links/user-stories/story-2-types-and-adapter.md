# Story 2: Types and Adapter — Per-Sprint View Models with ADO URLs

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** frontend developer
**I want** the dashboard adapter to transform the new per-sprint overhead API response into typed view models with ADO URLs
**So that** UI components can render overhead items for any sprint with clickable links to Azure DevOps

## Acceptance Criteria

- [x] Given the API returns `overheadItemsBySprint`, when the adapter maps the response, then `WorkstreamCardViewModel` contains `overheadItemsBySprint: OverheadSprintViewModel[]` (replacing `currentSprintBugItems` / `currentSprintSupportItems`)
- [x] Given an overhead item with `adoId: 12345`, when the adapter maps it, then `OverheadItemViewModel.adoUrl` equals `https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform/_workitems/edit/12345`
- [x] Given the new types, when TypeScript compiles, then `ApiOverheadItemsBySprint` and `OverheadSprintViewModel` are correctly defined and exported
- [x] Given `OverheadItemViewModel.adoId` is `#12345` (display format), when the URL is constructed, then the numeric `adoId` from the API item is used (not the formatted string)

## Implementation Tasks

- [x] 2.1 In `lib/dashboard/types.ts`, add `ApiOverheadItemsBySprint` interface: `{ sprintId: string; bugs: ApiOverheadItem[]; spikes: ApiOverheadItem[]; support: ApiOverheadItem[] }`
- [x] 2.2 In `lib/dashboard/types.ts`, update `ApiWorkstream` — replace `currentSprintOverheadItems?: { bugs: ApiOverheadItem[]; support: ApiOverheadItem[] }` with `overheadItemsBySprint?: ApiOverheadItemsBySprint[]`
- [x] 2.3 In `lib/dashboard/types.ts`, add `adoUrl: string` to `OverheadItemViewModel`
- [x] 2.4 In `lib/dashboard/types.ts`, add `OverheadSprintViewModel` interface: `{ sprintId: string; bugs: OverheadItemViewModel[]; spikes: OverheadItemViewModel[]; support: OverheadItemViewModel[] }`
- [x] 2.5 In `lib/dashboard/types.ts`, update `WorkstreamCardViewModel` — replace `currentSprintBugItems: OverheadItemViewModel[]` and `currentSprintSupportItems: OverheadItemViewModel[]` with `overheadItemsBySprint: OverheadSprintViewModel[]`
- [x] 2.6 In `lib/dashboard/adapter.ts`, update `mapOverheadItem` to accept `ApiOverheadItem` and add `adoUrl: buildAdoWorkItemUrl(item.adoId)` (import from `lib/ado/urls.ts`). The function currently formats `adoId` as `#${item.adoId}` — the numeric `item.adoId` must be used for URL construction before string formatting.
- [x] 2.7 In `lib/dashboard/adapter.ts`, replace the `currentSprintBugItems` / `currentSprintSupportItems` mapping (lines ~540-543) with a loop over `ws.overheadItemsBySprint` that maps all 3 categories (bugs, spikes, support) per sprint into `OverheadSprintViewModel[]`
- [x] 2.8 Update `__tests__/lib/dashboard/adapter.test.ts` — test the new `overheadItemsBySprint` mapping, verify `adoUrl` construction, verify spikes are mapped
- [x] 2.9 Run tests: `pnpm jest __tests__/lib/dashboard/adapter.test.ts`

## Notes

- `buildAdoWorkItemUrl` is already exported from `lib/ado/urls.ts` and used by `sprint-stories-adapter.ts`
- Current `mapOverheadItem` (adapter.ts line ~249): formats `adoId` as `#${item.adoId}`, maps `title`, `state`, `hours` (via `formatHours`), computes `isClosed`
- The `isClosed` check for bugs uses `BUG_RESOLVED_STATES`; for spikes and support, determine appropriate closed-state logic (likely same resolved states, or check the `state` field for `Closed`/`Done`)

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] TypeScript compiles without errors
- [x] No breaking changes to other consumers of these types
