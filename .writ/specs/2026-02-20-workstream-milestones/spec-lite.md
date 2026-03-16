# Phase 1E: Workstream Milestones — Spec Lite

> For AI context windows. See spec.md for full details.
> Updated: 2026-03-09

## What We're Building

Replace manual MilestonePanel with ADO-driven monthly goal tracking for the Annual Development Plan (ADP). ADO Features tagged `ADP-FEB`, `ADP-MAR` etc. become milestones. Features also carry `Qx` quarter tags (e.g., `Q4`) for quarterly roll-up grouping. Progress = completed child UserStory SP / total child SP. Display: burnup chart per Feature, grouped by month, with program-level quarterly roll-up in ProgramSummarySection.

## Key Decisions

- **Tag format:** `ADP-{MON}` (e.g., `ADP-MAR`) — strict, case-insensitive. All non-conforming tags ignored.
- **Quarter tags:** `Qx` (e.g., `Q4`) — explicit quarterly grouping, replaces inferred-from-month logic
- **Visual:** Burnup chart (cumulative completed SP vs total SP per sprint)
- **RAG:** None — show data only
- **Sync:** Separate WIQL per workstream (area path only, no iteration filter, Feature type, tag contains `ADP-`)
- **Panel:** Replace manual CRUD with ADO-driven `MilestoneGoalsPanel`
- **Status:** Derived from progress via `deriveMilestoneStatus()` at API time (not raw DB status)
- **No backward compat:** Legacy `{MonthAbbr}-Goal` tags are not recognized

## Data Flow

```
ADO Feature (tagged ADP-MAR, Q4)
  → WorkItem upsert + Milestone record auto-created (targetMonth from ADP tag, quarter from Qx tag)
  → Progress calculator: child UserStories by parentAdoId
  → deriveMilestoneStatus(): 0%=NotStarted, 1-99%=InProgress, 100%=Done
  → GET /api/milestones (extended with completedPoints, totalPoints, burnupData, quarter)
  → adapter.ts → MilestoneGoalViewModel[]
  → MilestoneGoalsPanel → FeatureMilestoneCard + BurnupChart
  → ProgramSummarySection (renders quarterly rollup from Qx tags)
```

## New Files (Phase 1)

| File | Purpose |
|------|---------|
| `lib/sync/milestone-features.ts` | Feature Goal Sync — WIQL query + ADP tag parsing |
| `lib/milestones/calculator.ts` | Progress + burnup computation |
| `components/Dashboard/BurnupChart.tsx` | Area chart for SP burnup |
| `components/Dashboard/FeatureMilestoneCard.tsx` | Single Feature goal card |
| `components/Dashboard/MilestoneGoalsPanel.tsx` | Panel with month grouping |

## Modified Files (Phase 1)

| File | Change |
|------|--------|
| `lib/sync/orchestrator.ts` | Add Feature Goal Sync step |
| `lib/milestones/types.ts` | Add progress fields to ApiMilestone |
| `app/api/milestones/route.ts` | Extend GET with progress + program roll-up |
| `lib/dashboard/types.ts` | Add MilestoneGoalViewModel, MilestoneMonthGroup |
| `lib/dashboard/adapter.ts` | Add milestone mapping functions |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Swap MilestonePanel → MilestoneGoalsPanel |

## Phase 2 Changes (ADP Extension)

| File | Change |
|------|--------|
| `lib/sync/milestone-features.ts` | Replace `-Goal` with strict `ADP-{MON}` parsing; add `Qx` quarter parsing |
| `lib/milestones/calculator.ts` | Quarter-tag-driven rollup grouping |
| `app/api/milestones/route.ts` | Wire `deriveMilestoneStatus()`; add quarter to response |
| `components/Dashboard/FeatureMilestoneCard.tsx` | Fix status check (`'Done'` not `'Complete'`) |
| `components/Dashboard/ProgramSummarySection.tsx` | Surface `programRollup` data |

## Constraints

- Burnup history = rolling sprint window only (~5 sprints)
- Features with no child UserStories → empty state (0/0 SP)
- Milestone status derived at API time from progress, not stored status
- No schema changes needed (WorkItem.tags + WorkItem.parentAdoId already exist)
- ADO Features must be retagged to `ADP-{MON}` + `Qx` format — legacy tags stop working

## Stories

### Phase 1 (Complete ✅)
1. Feature Goal Sync (sync module + orchestrator integration)
2. Progress Calculator (pure functions for SP computation + burnup)
3. API Extension (extend GET /api/milestones with progress + roll-up)
4. Types & Adapter (new view model types + mapping functions)
5. MilestoneGoalsPanel Component (BurnupChart + FeatureMilestoneCard + panel)
6. Dashboard Integration (wire panel, deprecate manual CRUD)

### Phase 2 (ADP Extension — Q4 FY26)
7. ADP Tag Format Migration (replace `-Goal` with strict `ADP-{MON}`, update WIQL)
8. Quarter Tag Parsing & Rollup (parse `Qx` tags, quarter-driven program rollup)
9. Milestone Status Derivation Fix (wire `deriveMilestoneStatus()` into API, fix card status check)
10. Program Rollup UI (surface `programRollup` in ProgramSummarySection)
