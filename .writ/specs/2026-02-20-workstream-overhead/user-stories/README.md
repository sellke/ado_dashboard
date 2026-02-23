# User Stories Overview

> **Specification:** Phase 1D — Workstream Overhead Section
> **Created:** 2026-02-20
> **Status:** Completed ✅

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [Schema Migration & Calculator Breakdown](./story-1-schema-and-calculator.md) | Completed ✅ | 7 | 7/7 |
| 2 | [API Contract Extension](./story-2-api-extension.md) | Completed ✅ | 6 | 6/6 |
| 3 | [Dashboard Types and Adapter](./story-3-types-and-adapter.md) | Completed ✅ | 7 | 7/7 |
| 4 | [Overhead Composition Chart Component](./story-4-overhead-composition-chart.md) | Completed ✅ | 6 | 6/6 |
| 5 | [Current Sprint Item Tables Component](./story-5-current-sprint-item-tables.md) | Completed ✅ | 6 | 6/6 |
| 6 | [OverheadBreakdownPanel & Card Integration](./story-6-panel-integration-and-testing.md) | Completed ✅ | 7 | 7/7 |

**Total Progress:** 39/39 tasks (100%)

## Story Dependencies

```
Story 1 (Schema + Calculator)
    ↓
Story 2 (API Extension)
    ↓
Story 3 (Types + Adapter)
    ↓
┌───┴───┐
↓       ↓
Story 4  Story 5    ← Can run in parallel
(Chart)  (Item Tables)
└───┬───┘
    ↓
Story 6 (Panel + Card Integration)
```

- **Story 1** ✅ Completed — Story 2 is now unblocked
- **Story 2** ✅ Completed — Story 3 is now unblocked
- **Story 3** ✅ Completed — Stories 4 & 5 are now unblocked (can run in parallel)
- **Story 4** ✅ Completed — Story 6 is partially unblocked (needs Story 5 too)
- **Story 5** ✅ Completed — Story 6 is now unblocked
- **Story 6** ✅ Completed — Phase 1D fully delivered

## Key Files Affected

| File | Stories |
|------|---------|
| `prisma/schema.prisma` | 1 |
| `prisma/migrations/` | 1 (new migration) |
| `lib/metrics/types.ts` | 1 |
| `lib/metrics/calculators.ts` | 1 |
| `lib/metrics/orchestrator.ts` | 1 |
| `app/api/metrics/route.ts` | 2 |
| `lib/dashboard/types.ts` | 3 |
| `lib/dashboard/adapter.ts` | 3 |
| `__fixtures__/dashboard-fixtures.ts` | 3, 6 |
| `components/Dashboard/OverheadCompositionChart.tsx` | 4 (new) |
| `components/Dashboard/CurrentSprintItemTables.tsx` | 5 (new) |
| `components/Dashboard/OverheadBreakdownPanel.tsx` | 6 (new) |
| `components/Dashboard/WorkstreamHealthCard.tsx` | 6 |
