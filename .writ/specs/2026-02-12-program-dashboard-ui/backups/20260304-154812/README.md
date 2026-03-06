# User Stories Overview

> **Specification:** Program Dashboard UI
> **Created:** 2026-02-12
> **Status:** Completed ✅
> **Change Request Date:** 2026-02-16

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Dashboard Data Contract and Shell | Completed ✅ | 5 | 5/5 |
| 2 | Program Summary Section | Completed ✅ | 5 | 5/5 |
| 3 | Workstream Health Cards | Completed ✅ | 5 | 5/5 |
| 4 | Dashboard State Coverage and Storybook | Completed ✅ | 5 | 5/5 |
| 5 | Dashboard Sync Trigger and Auto-Refresh | Completed ✅ | 6 | 6/6 |
| 6 | Metric Calculation Service and Trend API | Completed ✅ | 6 | 6/6 |
| 7 | Trend and Bug Metrics UI Integration | Completed ✅ | 6 | 6/6 |

**Total Progress:** 38/38 tasks (100%)

## Story Dependencies

```
Story 1 (Data Contract + Shell) ✅
   ├──> Story 2 (Program Summary) ✅
   ├──> Story 3 (Workstream Cards) ✅
   ├──> Story 4 (State Coverage + Storybook) ✅
   ├──> Story 5 (Sync Trigger + Auto-Refresh) ✅
   └──> Story 6 (Metric Calc Service + Trend API) ✅
              └──> Story 7 (Trend + Bug UI Integration) ✅
                    depends on Story 2, 3, 4, and 6
```

## Quick Links

- [Story 1: Dashboard Data Contract and Shell](./story-1-dashboard-data-contract-and-shell.md) ✅
- [Story 2: Program Summary Section](./story-2-program-summary-section.md) ✅
- [Story 3: Workstream Health Cards](./story-3-workstream-health-cards.md) ✅
- [Story 4: Dashboard State Coverage and Storybook](./story-4-dashboard-state-coverage-and-storybook.md) ✅
- [Story 5: Dashboard Sync Trigger and Auto-Refresh](./story-5-dashboard-sync-trigger-and-auto-refresh.md) ✅
- [Story 6: Metric Calculation Service and Trend API](./story-6-metric-calculation-service-and-trend-api.md) ✅
- [Story 7: Trend and Bug Metrics UI Integration](./story-7-trend-and-bug-metrics-ui-integration.md) ✅

## Notes

- Baseline dashboard delivery (Stories 1-5) remains valid and completed.
- Change request adds sprint-trend and bug metrics requiring backend computation and API contract expansion.
- Bug metrics are sprint-scoped and count only bugs assigned to each sprint.
- Sprint 5 includes predicted velocity only (`average velocity rate × current sprint net capacity hours`).
