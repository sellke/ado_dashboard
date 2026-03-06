# Story 1: API Per-Sprint Overhead Items with Spikes

> **Status:** Complete
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard consumer
**I want** the metrics API to return overhead items (bugs, spikes, support) for every rolling sprint
**So that** the frontend can display overhead items for any sprint selected via the shared SprintTabSelector, not just the current sprint

## Acceptance Criteria

- [x] Given the metrics API is called, when the response is returned, then each workstream includes `overheadItemsBySprint` — an array of per-sprint objects containing `{ sprintId, bugs, spikes, support }`
- [x] Given a workstream has spike work items in a sprint, when the API responds, then spikes appear alongside bugs and support with the shape `{ adoId, title, state, hours }`
- [x] Given a spike work item, when hours are computed, then `hours = completedWork ?? originalEstimate ?? null` (matching bug/support pattern)
- [x] Given the old `currentSprintOverheadItems` field, when the API changes are complete, then the old field no longer exists in the response

## Implementation Tasks

- [x] 1.1 Update the `initWorkstreamFormatted` function in `app/api/metrics/route.ts` — replace `currentSprintOverheadItems: { bugs: [], support: [] }` with `overheadItemsBySprint: []` (array to be populated per sprint)
- [x] 1.2 Inside the per-workstream sprint loop (where `trendBugs`, `trendSpikes`, `trendSupport` are already filtered), build per-sprint overhead objects containing bugs, spikes, and support items for each rolling sprint and push them into `overheadItemsBySprint`
- [x] 1.3 For spike items, map to `{ adoId, title, state, hours }` where `hours = sp.completedWork ?? sp.originalEstimate ?? null` (spikes currently use `storyPoints` for overhead breakdown hours, but `completedWork/originalEstimate` matches the per-item pattern of bugs/support)
- [x] 1.4 Remove the old `formatted.currentSprintOverheadItems = { bugs: ..., support: ... }` assignment that only handled the current sprint
- [x] 1.5 Update `__tests__/app/api/metrics/route.test.ts` — update assertions to expect the new `overheadItemsBySprint` shape, verify spikes are included, verify all 5 sprints have entries
- [x] 1.6 Run tests and verify the API route builds correctly: `pnpm jest __tests__/app/api/metrics/route.test.ts`

## Notes

- The data is already fetched: `trendBugs` (line ~275), `trendSupport` (line ~293), `trendSpikes` (line ~310) in `app/api/metrics/route.ts`
- Currently only `trendBugs` and `trendSupport` are used for `currentSprintOverheadItems` (lines ~458-475); `trendSpikes` is only used for aggregate `spikeHours`
- The spike Prisma query selects: `adoId, title, state, workstreamId, sprintId, storyPoints, completedWork, originalEstimate`
- Keep the existing overhead breakdown calculation unchanged — it uses aggregated hours, not per-item data

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
- [x] No regression in existing metrics API behavior
