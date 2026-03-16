# User Stories Overview

> **Specification:** Phase 1E — Workstream Milestones Section
> **Created:** 2026-02-20
> **Status:** Complete ✅ (6/6)

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Feature Goal Sync | Completed ✅ | 6 | 6/6 |
| 2 | Progress Calculator | Completed ✅ | 6 | 6/6 |
| 3 | API Extension | Completed ✅ | 6 | 6/6 |
| 4 | Types and Adapter | Completed ✅ | 7 | 7/7 |
| 5 | MilestoneGoalsPanel Component | Completed ✅ | 7 | 7/7 |
| 6 | Dashboard Integration | Completed ✅ | 6 | 6/6 |

**Total Progress:** 38/38 tasks (100%)

## Story Dependencies

```
Story 1 (Feature Goal Sync)
  → Story 2 (Progress Calculator)
    → Story 3 (API Extension)
      → Story 4 (Types & Adapter)
        → Story 5 (Components)    ─┐ parallel
        → Story 6 (Integration)   ─┘
```

- Stories 5 and 6 can run in parallel once Story 4 is complete
- Stories 1–4 must run sequentially

## Quick Links

- [Story 1: Feature Goal Sync](./story-1-feature-goal-sync.md)
- [Story 2: Progress Calculator](./story-2-progress-calculator.md)
- [Story 3: API Extension](./story-3-api-extension.md)
- [Story 4: Types and Adapter](./story-4-types-and-adapter.md)
- [Story 5: MilestoneGoalsPanel Component](./story-5-milestone-goals-panel.md)
- [Story 6: Dashboard Integration](./story-6-dashboard-integration.md)

## Key Deliverables per Story

| Story | Primary Output |
|-------|----------------|
| 1 | `lib/sync/milestone-features.ts` — Feature Goal Sync module |
| 2 | `lib/milestones/calculator.ts` — Progress + burnup computation |
| 3 | `GET /api/milestones` extended with progress + program roll-up |
| 4 | New view model types + adapter mapping functions |
| 5 | `BurnupChart`, `FeatureMilestoneCard`, `MilestoneGoalsPanel` components |
| 6 | Dashboard wired end-to-end; manual CRUD panel deprecated |
