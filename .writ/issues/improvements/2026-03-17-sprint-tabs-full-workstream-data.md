# Sprint Tabs Should Reflect All Workstream Data for Selected Sprint

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Medium
> **Created:** 2026-03-17

## TL;DR

When switching sprint tabs, workstream cards should update all data (metrics, overhead, velocity, stories) to reflect the selected sprint — not just the story list.

## Current State

- Sprint tabs exist via `SprintTabSelector` and are rendered in `WorkstreamCardsGrid`
- Selecting a sprint tab passes `activeSprintId` to each `WorkstreamHealthCard`
- Only `SprintStoryListPanel` currently responds to the selected sprint
- Core metrics (Velocity, Velocity Rate, Overhead %, Carry-Over %), overhead breakdown, and detail block remain pinned to the overall/current sprint regardless of tab selection

## Expected Outcome

- Switching a sprint tab scopes **all** workstream card data to that sprint:
  - Metrics row values reflect the selected sprint's calculated metrics
  - Overhead breakdown panel shows items for the selected sprint
  - Detail block (story points planned/completed, gross hours) reflects selected sprint
  - Velocity trend chart highlights the selected sprint in context
  - Story list panel (already working) continues to show stories for the selected sprint
- The "current" sprint tab remains the default selection on load

## Relevant Files

- `components/Dashboard/WorkstreamCardsGrid.tsx` - owns sprint tab state and passes `activeSprintId` down
- `components/Dashboard/WorkstreamHealthCard.tsx` - renders metrics, overhead, detail, and story list per workstream
- `lib/dashboard/sprint-utils.ts` - derives unified sprint list from `sprintStoriesMap`
