# Phase 1E: Technical Specification

> See [spec.md](../spec.md) for the full specification.

## Architecture Overview

Phase 1E adds an ADO-driven milestone tracking layer to the dashboard. It builds on the existing ADO sync pipeline and WorkItem table by adding a Feature Goal Sync step and a progress calculator.

### Key Architectural Decisions

1. **No schema changes** — `WorkItem.tags` and `WorkItem.parentAdoId` already exist. `Milestone` table already exists. Progress is computed at query time from WorkItem data.
2. **Separate sync query** — Features have no iteration path, so they require a new WIQL query (area path + tag filter) separate from the sprint-windowed work item sync.
3. **Milestone table as ADO-driven** — After this story, `Milestone` records are created/updated by sync, not by manual CRUD. Manual CRUD endpoints remain but are no longer exposed in the UI.
4. **Progress computed at API time** — No new persisted fields for completedSP/totalSP. Progress is always computed fresh from WorkItem state.

## New Module: `lib/sync/milestone-features.ts`

### Responsibilities
- Build WIQL query for Features with `-Goal` tags in a workstream's area path
- Parse `{MonthAbbr}-Goal` tag format to derive `targetMonth` Date
- Fetch and upsert Feature WorkItems
- Auto-create/update Milestone records from synced Features

### Functions

```typescript
// Build WIQL for Features with -Goal tags under an area path (no iteration filter)
export function buildFeatureGoalWiql(areaPath: string): string

// Parse "Feb-Goal" → Date(2026-02-01). Returns null if unrecognized format.
export function parseGoalTag(tags: string): Date | null

// Sync all Features with -Goal tags for a workstream; upsert WorkItems + Milestones
export async function syncMilestoneFeatures(
  workstream: Pick<Workstream, 'id' | 'adoAreaPath' | 'name'>,
  context: MilestoneFeatureSyncContext
): Promise<MilestoneFeatureSyncResult>
```

### Tag Parsing Logic

```
Input tags string (semicolon-separated): "Feb-Goal; Sprint Planning; Other"
1. Split by ";" and trim each part
2. Find the part matching /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-Goal$/i
3. Extract month abbreviation, map to month index (0-11)
4. Year = current year; if month index < today.getMonth(), use next year
5. Return new Date(year, monthIndex, 1)
```

## New Module: `lib/milestones/calculator.ts`

### Responsibilities
- Compute completedSP/totalSP per Feature from child UserStory WorkItems
- Generate burnup data points (cumulative completed SP per sprint)
- Derive milestone status from progress percent
- Compute program-level monthly/quarterly roll-up

### Types

```typescript
export interface BurnupDataPoint {
  sprintName: string;
  sprintId: string;
  cumulativeCompletedSP: number;
  totalSP: number;
}

export interface MilestoneProgress {
  adoFeatureId: number;
  totalSP: number;
  completedSP: number;
  percentComplete: number | null;
  burnupData: BurnupDataPoint[];
}

export interface ProgramMilestoneRollup {
  currentMonth: string;
  currentMonthCompletionPercent: number | null;
  currentMonthTotalSP: number;
  currentMonthCompletedSP: number;
  quarterlyMilestones: {
    total: number;
    complete: number;
    inProgress: number;
    notStarted: number;
  };
}
```

### Done-Like States

`'Done'`, `'Closed'`, `'Resolved'` count as completed for story point calculation.

## API Route Changes: `app/api/milestones/route.ts`

### GET Handler — Extended Query Flow

```
1. Fetch milestones (with workstream)
2. Collect adoFeatureIds from milestones
3. Query WorkItems: type=Feature, adoId IN adoFeatureIds
4. Query child WorkItems: type=UserStory, parentAdoId IN adoIds, include sprint
5. Call computeMilestoneProgress() per feature
6. Call computeProgramMilestoneRollup() for program roll-up
7. Return { milestones: [...], programRollup: {...} }
```

### Breaking Change

The response shape changes from `ApiMilestone[]` to `{ milestones: ApiMilestoneWithProgress[], programRollup: ApiProgramMilestoneRollup }`. All callers must be updated.

## Component Architecture

```
MilestoneGoalsPanel
  ├── Props: milestoneGroups: MilestoneMonthGroup[], loading, error
  ├── Renders month groups (current first, future, then past)
  └── Per group:
        ├── Group header (month label, completion %)
        └── FeatureMilestoneCard[]
              ├── Props: milestone: MilestoneGoalViewModel
              ├── Title + ADO ID badge
              ├── SP counts + formatted percent
              └── BurnupChart
                    ├── Props: data: ApiBurnupPoint[]
                    └── Mantine AreaChart (Completed SP + Target SP series)
```

## Test Strategy

| Layer | Test Type | Key Scenarios |
|-------|-----------|---------------|
| `parseGoalTag` | Unit | All 12 months, year rollover, invalid format |
| `buildFeatureGoalWiql` | Unit | Area path escaping, correct WHERE clauses |
| `computeMilestoneProgress` | Unit | No children, partial, complete, burnup ordering |
| `computeProgramMilestoneRollup` | Unit | Current month filter, quarterly counts |
| `GET /api/milestones` | Integration | Progress fields present, programRollup, workstreamId filter |
| `MilestoneGoalsPanel` | Component | Month ordering, loading state, empty state |
| `FeatureMilestoneCard` | Component | Complete style, empty chart, ADO ID badge |
| `BurnupChart` | Component | Series rendering, empty state |
| Dashboard integration | Integration | End-to-end data flow from API to panel |

## Build Order

```
Story 1 (Feature Goal Sync)
  → Story 2 (Progress Calculator)
    → Story 3 (API Extension)
      → Story 4 (Types & Adapter)
        → Story 5 (Components) + Story 6 (Integration) [parallel]
```
