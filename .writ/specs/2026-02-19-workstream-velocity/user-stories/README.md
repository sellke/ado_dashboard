# User Stories Overview

> **Specification:** Phase 1C — Workstream Velocity Section
> **Created:** 2026-02-19
> **Status:** Completed ✅

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [API Data Contract Extension](./story-1-api-extension.md) | Completed ✅ | 7 | 7/7 |
| 2 | [Dashboard Types and Adapter](./story-2-types-and-adapter.md) | Completed ✅ | 10 | 10/10 |
| 3 | [Velocity Trend Chart Component](./story-3-velocity-trend-chart.md) | Completed ✅ | 6 | 6/6 |
| 4 | [Sprint Bug List Component](./story-4-sprint-bug-list.md) | Completed ✅ | 5 | 5/5 |
| 5 | [Card Integration and Testing](./story-5-card-integration-and-testing.md) | Completed ✅ | 7 | 7/7 |

**Total Progress:** 35/35 tasks (100%)

## Story Dependencies

```
Story 1 (API Extension)
    ↓
Story 2 (Types & Adapter)
    ↓
┌───┴───┐
↓       ↓
Story 3  Story 4    ← Can run in parallel
(Chart)  (Bug List)
└───┬───┘
    ↓
Story 5 (Card Integration & Testing)
```

- **Story 1** has no dependencies — start here
- **Story 2** depends on Story 1 (needs extended API response to map)
- **Stories 3 & 4** depend on Story 2 (need typed view models) — can run in parallel
- **Story 5** depends on Stories 3 & 4 (needs both components to integrate)

## Key Files Affected

| File | Stories |
|------|---------|
| `app/api/metrics/route.ts` | 1 |
| `lib/dashboard/types.ts` | 2 |
| `lib/dashboard/adapter.ts` | 2 |
| `components/Dashboard/VelocityTrendChart.tsx` | 3 (new) |
| `components/Dashboard/SprintBugList.tsx` | 4 (new) |
| `components/Dashboard/WorkstreamHealthCard.tsx` | 5 |
| `__fixtures__/dashboard-fixtures.ts` | 2, 5 |
