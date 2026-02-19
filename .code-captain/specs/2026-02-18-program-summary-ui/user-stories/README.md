# User Stories Overview

> **Specification:** Phase 1B — Program Summary UI
> **Created:** 2026-02-18
> **Status:** Complete ✅
> **Prior Spec:** [2026-02-12-program-dashboard-ui](../../2026-02-12-program-dashboard-ui/user-stories/README.md) (Stories 1-7, 100% complete)

## Stories Summary

### Completed (Prior Spec)

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Dashboard Data Contract and Shell | Done | 5 | 5/5 |
| 2 | Program Summary Section | Done | 5 | 5/5 |
| 3 | Workstream Health Cards | Done | 5 | 5/5 |
| 4 | Dashboard State Coverage and Storybook | Done | 5 | 5/5 |
| 5 | Dashboard Sync Trigger and Auto-Refresh | Done | 6 | 6/6 |
| 6 | Metric Calculation Service and Trend API | Done | 6 | 6/6 |
| 7 | Trend and Bug Metrics UI Integration | Done | 6 | 6/6 |

**Prior Spec Progress:** 38/38 tasks (100%)

### New Work (This Spec)

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 8 | Metric Display Adjustments (Predictability Removal + Carry-Over Rename) | Done ✅ | 6 | 6/6 |
| 9 | Milestone Tile Data Contract and Placeholder UI | Done ✅ | 6 | 6/6 |
| 10 | End-to-End Metric Validation | Done ✅ | 5 | 5/5 |

**New Work Progress:** 17/17 tasks (100%)

**Overall Phase 1B Progress:** 55/55 tasks (100%)

## Story Dependencies

```
Stories 1-7 (Prior Spec — All Done) ✅
   └──► Story 8 (Predictability Removal + Carry-Over Rename)
            └──► Story 9 (Milestone Tile Placeholder UI)
                     └──► Story 10 (End-to-End Validation)
```

## Quick Links

### Completed Stories (Prior Spec)
- [Story 1: Dashboard Data Contract and Shell](../../2026-02-12-program-dashboard-ui/user-stories/story-1-dashboard-data-contract-and-shell.md) ✅
- [Story 2: Program Summary Section](../../2026-02-12-program-dashboard-ui/user-stories/) ✅
- [Story 3: Workstream Health Cards](../../2026-02-12-program-dashboard-ui/user-stories/story-3-workstream-health-cards.md) ✅
- [Story 4: Dashboard State Coverage and Storybook](../../2026-02-12-program-dashboard-ui/user-stories/story-4-dashboard-state-coverage-and-storybook.md) ✅
- [Story 5: Dashboard Sync Trigger and Auto-Refresh](../../2026-02-12-program-dashboard-ui/user-stories/story-5-dashboard-sync-trigger-and-auto-refresh.md) ✅
- [Story 6: Metric Calculation Service and Trend API](../../2026-02-12-program-dashboard-ui/user-stories/story-6-metric-calculation-service-and-trend-api.md) ✅
- [Story 7: Trend and Bug Metrics UI Integration](../../2026-02-12-program-dashboard-ui/user-stories/story-7-trend-and-bug-metrics-ui-integration.md) ✅

### New Stories (This Spec)
- [Story 8: Metric Display Adjustments](./story-8-metric-display-adjustments.md)
- [Story 9: Milestone Tile Placeholder UI](./story-9-milestone-tile-placeholder-ui.md)
- [Story 10: End-to-End Metric Validation](./story-10-end-to-end-validation.md)

## Notes

- Stories 1-7 are documented in the prior spec but referenced here for Phase 1B traceability
- Story 8 temporarily reduces the Program Summary to 3 tiles; Story 9 brings it to the final 5-tile layout
- Story 10 is the Phase 1B "seal of approval" — it must pass before proceeding to Phases 1C-1F
- Milestone tiles will show placeholder state until Phase 1E provides real ADO Feature tag data
