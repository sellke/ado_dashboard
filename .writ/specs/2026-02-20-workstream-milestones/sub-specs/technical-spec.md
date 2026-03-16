# Phase 1E: Technical Specification

> See [spec.md](../spec.md) for the full specification.
> Updated: 2026-03-09

## Architecture Overview

Phase 1E adds an ADO-driven milestone tracking layer to the dashboard aligned with the Annual Development Plan (ADP). It builds on the existing ADO sync pipeline and WorkItem table by adding a Feature Goal Sync step and a progress calculator. Features are tagged with `ADP-{MON}` monthly tags and `Qx` quarter tags in ADO.

### Key Architectural Decisions

1. **No schema changes** — `WorkItem.tags` and `WorkItem.parentAdoId` already exist. `Milestone` table already exists. Progress is computed at query time from WorkItem data.
2. **Separate sync query** — Features have no iteration path, so they require a new WIQL query (area path + `ADP-` tag filter) separate from the sprint-windowed work item sync.
3. **Milestone table as ADO-driven** — `Milestone` records are created/updated by sync, not by manual CRUD. Manual CRUD endpoints remain but are no longer exposed in the UI.
4. **Progress computed at API time** — No new persisted fields for completedSP/totalSP. Progress is always computed fresh from WorkItem state.
5. **Status derived from progress** — `deriveMilestoneStatus()` runs at API time: 0% → NotStarted, 1–99% → InProgress, 100% → Done. Raw DB status is not used.
6. **Strict tag enforcement** — Only `ADP-{MON}` format tags are recognized. All other tags (including legacy `-Goal` format) are ignored. No backward compatibility.
7. **Explicit quarter grouping** — `Qx` tags on Features drive quarterly roll-up grouping, replacing the previous infer-from-month approach.

## Module: `lib/sync/milestone-features.ts`

### Responsibilities
- Build WIQL query for Features with `ADP-` tags in a workstream's area path
- Parse `ADP-{MON}` tag format strictly to derive `targetMonth` Date
- Parse `Qx` tag format to derive quarter
- Fetch and upsert Feature WorkItems
- Auto-create/update Milestone records from synced Features

### Functions

```typescript
// Build WIQL for Features with ADP- tags under an area path (no iteration filter)
export function buildFeatureGoalWiql(areaPath: string): string

// Parse "ADP-MAR" → Date(2026-03-01). Returns null if format doesn't match.
// Strict: only /^ADP-(JAN|FEB|MAR|...|DEC)$/i is accepted.
export function parseAdpTag(tags: string): Date | null

// Parse "Q4" → "Q4". Returns null if format doesn't match /^Q[1-4]$/i.
export function parseQuarterTag(tags: string): string | null

// Sync all Features with ADP- tags for a workstream; upsert WorkItems + Milestones
export async function syncMilestoneFeatures(
  workstream: Pick<Workstream, 'id' | 'adoAreaPath' | 'name'>,
  context: MilestoneFeatureSyncContext
): Promise<MilestoneFeatureSyncResult>
```

### Tag Parsing Logic

```
Input tags string (semicolon-separated): "ADP-MAR; Q4; Sprint Planning; Other"

ADP Tag:
1. Split by ";" and trim each part
2. Find the part matching /^ADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i
3. Extract month abbreviation, map to month index (0-11)
4. Year = current year; if month index < today.getMonth(), use next year
5. Return new Date(year, monthIndex, 1)
6. If no match → return null (Feature is SKIPPED, no Milestone created)

Quarter Tag:
1. Find the part matching /^Q[1-4]$/i
2. Return uppercase (e.g., "Q4")
3. If no match → return null (quarter field is null on Milestone)

Non-conforming examples that are REJECTED:
- "Feb-Goal" → null (legacy format)
- "ADP February" → null (not abbreviated)
- "ADP-MAR-2026" → null (extra suffix)
- "adp-m" → null (incomplete)
```

## Module: `lib/milestones/calculator.ts`

### Responsibilities
- Compute completedSP/totalSP per Feature from child UserStory WorkItems
- Generate burnup data points (cumulative completed SP per sprint)
- Derive milestone status from progress percent
- Compute program-level monthly/quarterly roll-up using explicit `Qx` tags

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
  quarter: string | null;            // e.g., "Q4" — from explicit Qx tag
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

### Quarterly Roll-up Change (Phase 2)

Previously, quarterly roll-up grouped milestones by inferring quarter from `targetMonth`. After Story 8, quarterly grouping uses the explicit `Qx` tag stored on each Milestone record. This means:
- Milestones without a `Qx` tag are excluded from quarterly counts
- The quarter is not assumed from the month — it must be explicitly tagged in ADO

## API Route Changes: `app/api/milestones/route.ts`

### GET Handler — Extended Query Flow

```
1. Fetch milestones (with workstream)
2. Collect adoFeatureIds from milestones
3. Query WorkItems: type=Feature, adoId IN adoFeatureIds
4. Query child WorkItems: type=UserStory, parentAdoId IN adoIds, include sprint
5. Call computeMilestoneProgress() per feature
6. Call deriveMilestoneStatus() per milestone (replaces raw DB status)
7. Call computeProgramMilestoneRollup() for program roll-up (using Qx tags)
8. Return { milestones: [...], programRollup: {...} }
```

### Breaking Change

The response shape changes from `ApiMilestone[]` to `{ milestones: ApiMilestoneWithProgress[], programRollup: ApiProgramMilestoneRollup }`. All callers must be updated.

### Status Derivation (Phase 2)

After Story 9, the `status` field in the API response is derived from `percentComplete` via `deriveMilestoneStatus()`, not read from the database. This ensures status always reflects current child story progress.

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
              ├── Status: derived, checked via milestone.status === 'Done'
              └── BurnupChart
                    ├── Props: data: ApiBurnupPoint[]
                    └── Recharts AreaChart (Completed SP + Target SP series)
```

## Test Strategy

| Layer | Test Type | Key Scenarios |
|-------|-----------|---------------|
| `parseAdpTag` | Unit | All 12 months, year rollover, invalid format, legacy format rejection |
| `parseQuarterTag` | Unit | Q1–Q4, invalid format, case insensitivity |
| `buildFeatureGoalWiql` | Unit | Area path escaping, correct WHERE clauses, `ADP-` filter |
| `computeMilestoneProgress` | Unit | No children, partial, complete, burnup ordering |
| `deriveMilestoneStatus` | Unit | 0% → NotStarted, 50% → InProgress, 100% → Done, null → NotStarted |
| `computeProgramMilestoneRollup` | Unit | Current month filter, quarterly counts via Qx tags |
| `GET /api/milestones` | Integration | Progress fields, programRollup, workstreamId filter, derived status |
| `MilestoneGoalsPanel` | Component | Month ordering, loading state, empty state |
| `FeatureMilestoneCard` | Component | Complete style (status=Done), empty chart, ADO ID badge |
| `BurnupChart` | Component | Series rendering, empty state |
| `ProgramSummarySection` | Component | Quarterly rollup tiles render correctly |
| Dashboard integration | Integration | End-to-end data flow from API to panel |
| Tag rejection | Unit | `Feb-Goal`, `ADP February`, `ADP-MAR-2026` all return null |

## Build Order

```
Phase 1 (Complete ✅):
Story 1 (Feature Goal Sync)
  → Story 2 (Progress Calculator)
    → Story 3 (API Extension)
      → Story 4 (Types & Adapter)
        → Story 5 (Components) + Story 6 (Integration) [parallel]

Phase 2 (ADP Extension):
Story 7 (ADP Tag Migration)
  → Story 8 (Quarter Tag Parsing)  ─┐
  → Story 9 (Status Derivation)    ─┤ parallel after 7
  → Story 10 (Program Rollup UI)  ─┘
```
