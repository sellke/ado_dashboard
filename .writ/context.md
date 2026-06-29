# Writ Project Context

> Last Updated: 2026-06-29T00:00:00Z

## Active Spec

- **Spec:** 2026-06-29-status-group-sp-total — Status Group Badge Story Point Totals
- **Status:** Complete
- **Story:** 1 of 1 — Status Group SP Badge (Completed ✅)
- **Progress:** 6/6 tasks complete (100%)

## What Was Built

- Added `totalStoryPoints: number` to `StatusGroupViewModel` in `lib/dashboard/types.ts`
- `mapSprintStoriesResponse()` sums raw API `storyPoints ?? 0` per status group in `lib/dashboard/sprint-stories-adapter.ts`
- `StatusSection` header badge in `SprintStoryListPanel.tsx` renders `group.totalStoryPoints` instead of `group.stories.length`
- Adapter tests for multi-story sum, null → 0, single-story, and all-unestimated groups
- Panel test asserting header badge shows point total; test factories derive `totalStoryPoints` from story rows

## Open Issues

- Origin improvement issue: `.writ/issues/improvements/2026-06-29-status-group-sp-total.md` — may be closable
