# User Stories Overview

> **Specification:** Overhead Sprint-Selectable ADO Links
> **Created:** 2026-03-05
> **Status:** Complete

## Stories Summary

| Story | Title | Status | Tasks | Progress |
| ----- | ----- | ------ | ----- | -------- |
| 1 | [API Per-Sprint Overhead Items with Spikes](./story-1-api-per-sprint-overhead.md) | Complete | 6 | 6/6 |
| 2 | [Types and Adapter — Per-Sprint View Models with ADO URLs](./story-2-types-and-adapter.md) | Complete | 9 | 9/9 |
| 3 | [UI Components — Sprint-Driven Overhead Display with ADO Links](./story-3-ui-sprint-driven-overhead.md) | Complete | 7 | 7/7 |

**Total Progress:** 22/22 tasks (100%)

## Story Dependencies

```
Story 1 (API)
  └── Story 2 (Types + Adapter)
        └── Story 3 (UI Components)
```

- Story 1 has no dependencies — can start immediately
- Story 2 depends on Story 1 (needs the new API response shape)
- Story 3 depends on Story 2 (needs the new view model types)

## Quick Links

- [Story 1: API Per-Sprint Overhead Items with Spikes](./story-1-api-per-sprint-overhead.md)
- [Story 2: Types and Adapter — Per-Sprint View Models with ADO URLs](./story-2-types-and-adapter.md)
- [Story 3: UI Components — Sprint-Driven Overhead Display with ADO Links](./story-3-ui-sprint-driven-overhead.md)

## Key Files Modified

| File | Stories |
|------|---------|
| `app/api/metrics/route.ts` | 1 |
| `lib/dashboard/types.ts` | 2 |
| `lib/dashboard/adapter.ts` | 2 |
| `components/Dashboard/WorkstreamHealthCard.tsx` | 3 |
| `components/Dashboard/OverheadBreakdownPanel.tsx` | 3 |
| `components/Dashboard/CurrentSprintItemTables.tsx` | 3 |
| `__tests__/app/api/metrics/route.test.ts` | 1 |
| `__tests__/lib/dashboard/adapter.test.ts` | 2 |
| `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` | 3 |
| `__tests__/components/Dashboard/OverheadBreakdownPanel.test.tsx` | 3 |
| `__tests__/components/Dashboard/CurrentSprintItemTables.test.tsx` | 3 |
