# User Stories Overview

> **Specification:** Phase 1E — Workstream Milestones Section
> **Created:** 2026-02-20
> **Updated:** 2026-03-09
> **Phase 1 Status:** Complete ✅ (6/6)
> **Phase 2 Status:** Complete ✅ (4/4)

## ADP & Q4 FY26 Context

These stories support the Annual Development Plan (ADP) for Q4 FY26 (January–March 2026). Phase 1 established the core milestone infrastructure using `-Goal` tags. Phase 2 migrates to the strict `ADP-{MON}` tag convention with `Qx` quarter tags, fixes codebase gaps, and surfaces the quarterly roll-up in the UI.

## Stories Summary

### Phase 1 — Core Milestone Infrastructure (Complete ✅)

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Feature Goal Sync | Completed ✅ | 6 | 6/6 |
| 2 | Progress Calculator | Completed ✅ | 6 | 6/6 |
| 3 | API Extension | Completed ✅ | 6 | 6/6 |
| 4 | Types and Adapter | Completed ✅ | 7 | 7/7 |
| 5 | MilestoneGoalsPanel Component | Completed ✅ | 7 | 7/7 |
| 6 | Dashboard Integration | Completed ✅ | 6 | 6/6 |

**Phase 1 Total:** 38/38 tasks (100%)

### Phase 2 — ADP Extension (Q4 FY26)

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 7 | ADP Tag Format Migration | Completed ✅ | 7 | 7/7 |
| 8 | Quarter Tag Parsing & Rollup | Completed ✅ | 7 | 7/7 |
| 9 | Milestone Status Derivation Fix | Completed ✅ | 5 | 5/5 |
| 10 | Program Rollup UI | Completed ✅ | 5 | 5/5 |

**Phase 2 Total:** 24/24 tasks (100%)

**Overall Total:** 62/62 tasks (100%)

## Story Dependencies

### Phase 1 (Complete)
```
Story 1 (Feature Goal Sync)
  → Story 2 (Progress Calculator)
    → Story 3 (API Extension)
      → Story 4 (Types & Adapter)
        → Story 5 (Components)    ─┐ parallel
        → Story 6 (Integration)   ─┘
```

### Phase 2 (ADP Extension)
```
Story 7 (ADP Tag Migration)    ← Critical path: replaces -Goal with ADP-{MON}
  → Story 8 (Quarter Tags)     ─┐
  → Story 9 (Status Fix)       ─┤ parallel after 7
  → Story 10 (Rollup UI)       ─┘
```

- Story 7 is the Phase 2 critical path — modifies Story 1's sync code
- Stories 8, 9, 10 can run in parallel once Story 7 is complete
- Stories 8, 9, 10 are independent of each other

## Quick Links

### Phase 1
- [Story 1: Feature Goal Sync](./story-1-feature-goal-sync.md)
- [Story 2: Progress Calculator](./story-2-progress-calculator.md)
- [Story 3: API Extension](./story-3-api-extension.md)
- [Story 4: Types and Adapter](./story-4-types-and-adapter.md)
- [Story 5: MilestoneGoalsPanel Component](./story-5-milestone-goals-panel.md)
- [Story 6: Dashboard Integration](./story-6-dashboard-integration.md)

### Phase 2
- [Story 7: ADP Tag Format Migration](./story-7-adp-tag-migration.md)
- [Story 8: Quarter Tag Parsing & Rollup](./story-8-quarter-tag-parsing.md)
- [Story 9: Milestone Status Derivation Fix](./story-9-status-derivation-fix.md)
- [Story 10: Program Rollup UI](./story-10-program-rollup-ui.md)

## Key Deliverables per Story

### Phase 1 (Complete)
| Story | Primary Output |
|-------|----------------|
| 1 | `lib/sync/milestone-features.ts` — Feature Goal Sync module |
| 2 | `lib/milestones/calculator.ts` — Progress + burnup computation |
| 3 | `GET /api/milestones` extended with progress + program roll-up |
| 4 | New view model types + adapter mapping functions |
| 5 | `BurnupChart`, `FeatureMilestoneCard`, `MilestoneGoalsPanel` components |
| 6 | Dashboard wired end-to-end; manual CRUD panel deprecated |

### Phase 2 (ADP Extension)
| Story | Primary Output |
|-------|----------------|
| 7 | `parseAdpTag()` replacing `parseGoalTag()`, WIQL updated to `ADP-` |
| 8 | `parseQuarterTag()`, quarter-tag-driven `computeProgramMilestoneRollup()` |
| 9 | `deriveMilestoneStatus()` wired into API, `FeatureMilestoneCard` status fix |
| 10 | `ProgramSummarySection` renders quarterly rollup tiles |
