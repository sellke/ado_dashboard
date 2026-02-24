# User Stories Overview

> **Specification:** Phase 1C — Workstream Velocity Section
> **Created:** 2026-02-19
> **Last Amended:** 2026-02-23
> **Status:** In Progress 🔄 (original work complete; amendment work pending)

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [API Data Contract Extension](./story-1-api-extension.md) | Amended — Pending 🔄 | 7+6 | 7/13 |
| 2 | [Dashboard Types and Adapter](./story-2-types-and-adapter.md) | Amended — Pending 🔄 | 10+5 | 10/15 |
| 3 | [Velocity Trend Chart Component](./story-3-velocity-trend-chart.md) | Amended — Pending 🔄 | 6+2 | 6/8 |
| 4 | [Sprint Bug List Component](./story-4-sprint-bug-list.md) | Completed ✅ | 5 | 5/5 |
| 5 | [Card Integration and Testing](./story-5-card-integration-and-testing.md) | Completed ✅ | 7 | 7/7 |
| 6 | [Overhead Breakdown Sync & API](./story-6-overhead-breakdown-sync-and-api.md) | Not Started ⬜ | 8 | 0/8 |
| 7 | [Overhead Breakdown Chart & Integration](./story-7-overhead-breakdown-chart.md) | Not Started ⬜ | 9 | 0/9 |

**Original Progress:** 35/35 tasks (100%) — all original stories complete  
**Amendment Progress:** 0/30 new/amended tasks (0%)  
**Total Progress:** 35/65 tasks (54%)

## Story Dependencies

```
Story 1 (API Extension + Data Fix)
    ↓
Story 2 (Types & Adapter + Carry-Over Fix)
    ↓
┌───┴───────────────────┐
↓                       ↓
Story 3 (Chart Fix)   Story 6 (Overhead Sync & API)
                        ↓
                      Story 7 (Overhead Chart)
                        ↓
                      Story 5 amendments (Card Integration)

Story 4 — No dependencies (already complete, no amendments)
```

- **Story 1** has no dependencies for amendments — start here
- **Story 2** amendments depend on Story 1 (overhead type definitions need confirmation)
- **Story 3** amendments depend on Story 1 data fix (verifying real data renders)
- **Story 6** depends on Story 1 task 1.12 (DB investigation results gate sync scope)
- **Story 7** depends on Story 2 (needs `OverheadBreakdownItem` types) and Story 6 (needs API data)

## Key Files Affected

| File | Stories |
|------|---------|
| `app/api/metrics/route.ts` | 1, 6 |
| `lib/metrics/trend-service.ts` | 1 (data fix) |
| `lib/ado/sync-service.ts` | 6 (potential ADO sync extension) |
| `lib/dashboard/types.ts` | 2, 6 |
| `lib/dashboard/adapter.ts` | 2, 7 |
| `components/Dashboard/VelocityTrendChart.tsx` | 3 |
| `components/Dashboard/SprintBugList.tsx` | 4 (no changes) |
| `components/Dashboard/OverheadBreakdownChart.tsx` | 7 (new) |
| `components/Dashboard/WorkstreamHealthCard.tsx` | 7 |
| `__fixtures__/dashboard-fixtures.ts` | 2, 7 |
