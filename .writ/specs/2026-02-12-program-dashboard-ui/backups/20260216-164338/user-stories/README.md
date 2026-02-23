# User Stories Overview

> **Specification:** Program Dashboard UI
> **Created:** 2026-02-12
> **Status:** Completed ✅

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Dashboard Data Contract and Shell | Completed ✅ | 5 | 5/5 |
| 2 | Program Summary Section | Completed ✅ | 5 | 5/5 |
| 3 | Workstream Health Cards | Completed ✅ | 5 | 5/5 |
| 4 | Dashboard State Coverage and Storybook | Completed ✅ | 5 | 5/5 |
| 5 | Dashboard Sync Trigger and Auto-Refresh | Completed ✅ | 6 | 6/6 |

**Total Progress:** 26/26 tasks (100%)

## Story Dependencies

```
Story 1 (Data Contract + Shell) ✅
   ├──> Story 2 (Program Summary) ✅
   ├──> Story 3 (Workstream Cards) ✅
   └──> Story 4 (State Coverage + Storybook) ✅
          depends on Story 1, 2, 3
   └──> Story 5 (Sync Trigger + Auto-Refresh) ✅
          depends on Story 1 and Story 4
```

## Quick Links

- [Story 1: Dashboard Data Contract and Shell](./story-1-dashboard-data-contract-and-shell.md) ✅
- [Story 2: Program Summary Section](./story-2-program-summary-section.md) ✅
- [Story 3: Workstream Health Cards](./story-3-workstream-health-cards.md) ✅
- [Story 4: Dashboard State Coverage and Storybook](./story-4-dashboard-state-coverage-and-storybook.md) ✅
- [Story 5: Dashboard Sync Trigger and Auto-Refresh](./story-5-dashboard-sync-trigger-and-auto-refresh.md) ✅

## Notes

- This package covers the roadmap item: "Program dashboard UI - Summary view + workstream health cards (Mantine)".
- Backend metric computation is already implemented and treated as a dependency, not part of these stories.
- Dashboard now also includes a single-action sync trigger that calls `POST /api/sync/ado` and auto-refreshes metrics.
