# Phase 1E: Workstream Milestones — Spec Lite

> For AI context windows. See spec.md for full details.

## What We're Building

Replace manual MilestonePanel with ADO-driven monthly goal tracking. ADO Features tagged `Feb-Goal`, `Mar-Goal` etc. become milestones. Progress = completed child UserStory SP / total child SP. Display: burnup chart per Feature, grouped by month.

## Key Decisions

- **Tag format:** `{MonthAbbr}-Goal` (e.g., `Feb-Goal`)
- **Visual:** Burnup chart (cumulative completed SP vs total SP per sprint)
- **RAG:** None — show data only
- **Sync:** Separate WIQL per workstream (area path only, no iteration filter, Feature type, tag contains `-Goal`)
- **Panel:** Replace manual CRUD with ADO-driven `MilestoneGoalsPanel`

## Data Flow

```
ADO Feature (tagged Feb-Goal)
  → WorkItem upsert + Milestone record auto-created
  → Progress calculator: child UserStories by parentAdoId
  → GET /api/milestones (extended with completedPoints, totalPoints, burnupData)
  → adapter.ts → MilestoneGoalViewModel[]
  → MilestoneGoalsPanel → FeatureMilestoneCard + BurnupChart
```

## New Files

| File | Purpose |
|------|---------|
| `lib/sync/milestone-features.ts` | Feature Goal Sync — new WIQL query |
| `lib/milestones/calculator.ts` | Progress + burnup computation |
| `components/Dashboard/BurnupChart.tsx` | Mantine AreaChart for SP burnup |
| `components/Dashboard/FeatureMilestoneCard.tsx` | Single Feature goal card |
| `components/Dashboard/MilestoneGoalsPanel.tsx` | Panel with month grouping |

## Modified Files

| File | Change |
|------|--------|
| `lib/sync/orchestrator.ts` | Add Feature Goal Sync step |
| `lib/milestones/types.ts` | Add progress fields to ApiMilestone |
| `app/api/milestones/route.ts` | Extend GET with progress + program roll-up |
| `lib/dashboard/types.ts` | Add MilestoneGoalViewModel, MilestoneMonthGroup |
| `lib/dashboard/adapter.ts` | Add milestone mapping functions |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Swap MilestonePanel → MilestoneGoalsPanel |

## Constraints

- Burnup history = rolling sprint window only (~5 sprints)
- Features with no child UserStories → empty state (0/0 SP)
- Milestone status derived at sync time: 0% = NotStarted, 1-99% = InProgress, 100% = Done
- No schema changes needed (WorkItem.tags + WorkItem.parentAdoId already exist)

## Stories

1. Feature Goal Sync (new sync module + orchestrator integration)
2. Progress Calculator (pure functions for SP computation + burnup)
3. API Extension (extend GET /api/milestones with progress + roll-up)
4. Types & Adapter (new view model types + mapping functions)
5. MilestoneGoalsPanel Component (BurnupChart + FeatureMilestoneCard + panel)
6. Dashboard Integration (wire panel, deprecate manual CRUD)
