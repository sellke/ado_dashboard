# Phase 1E: Workstream Milestones Section — Specification

> Created: 2026-02-20
> Updated: 2026-03-09
> Status: Complete (Phase 1) — ADP Extension In Progress
> Contract Locked: ✅

## ADP & Q4 FY26 Delivery Context

This specification supports the **Annual Development Plan (ADP)** for Q4 FY26 (January–March 2026). ADO Features are tagged with monthly ADP commitments (`ADP-{MON}`) and a shared quarter indicator (`Qx`). Each monthly milestone represents a concrete ADP deliverable; the quarterly roll-up aggregates these into a Q4 progress view for the program summary.

**ADP deadline:** End of March 2026 (Q4 FY26 close).

## Contract Summary

**Deliverable:** Replace the manual MilestonePanel with an ADO-driven `MilestoneGoalsPanel` — per-workstream display of ADO Features tagged as ADP monthly goals, showing story-point burnup progress per Feature, with a program-level monthly/quarterly roll-up feeding Phase 1B.

**Must Include:**
- New "Feature Goal Sync" step per workstream: WIQL by area path only (no iteration filter), Feature type, tag contains `ADP-`; auto-upserts Features to `WorkItem` table and creates/updates `Milestone` records
- Strict tag parsing: only `ADP-{MON}` format recognized (e.g., `ADP-FEB`, `ADP-MAR`). All non-conforming tags are ignored — no backward compatibility with legacy formats
- Quarter tag parsing: `Qx` tags (e.g., `Q4`) on the same Feature, used for quarterly roll-up grouping
- Progress calculation: `completedSP / totalSP` per Feature from child UserStory rows (via `parentAdoId` join), grouped by sprint for burnup
- Per-workstream `MilestoneGoalsPanel`: Features grouped by target month (current month highlighted), burnup chart per Feature
- `GET /api/milestones` extended to return progress data (completedSP, totalSP, burnupData) with quarter-aware roll-up
- Program-level monthly and quarterly roll-up (feeds 1B) — quarterly grouping driven by explicit `Qx` tags, not inferred from month
- Milestone status derived from progress at API time (not raw DB status)
- Deprecate manual CRUD (MilestonePanel, MilestoneFormModal) — no longer surfaced on dashboard

**Hardest Constraint:** Features typically have no `iterationPath`, so the existing WIQL query misses them. A separate sync query per workstream (area path only, tag-filtered) is required and must plug into the existing `SyncLog` / orchestrator pattern cleanly.

**Success Criteria:**
- ADO sync fetches `ADP-` tagged Features and creates/updates `Milestone` records with `adoFeatureId` populated
- Tags not matching `ADP-{MON}` format are strictly ignored (e.g., `Feb-Goal`, `Sprint Planning`, etc.)
- `Qx` quarter tag is parsed and stored on Milestone records for explicit quarterly grouping
- Progress (completedSP/totalSP) computes correctly from child UserStories already in the database
- Burnup chart renders per Feature showing sprint-by-sprint cumulative completed SP vs. total SP
- Monthly grouping correctly uses the `ADP-{MON}` tag to determine target month (e.g., `ADP-MAR` → March 2026)
- Milestone status is derived from progress (`deriveMilestoneStatus()`) at API time
- Program-level roll-up calculates `monthly completion %` and quarterly milestone counts using `Qx` tags
- Program rollup data is surfaced in `ProgramSummarySection` UI

**Scope Boundaries:**
- Included: Feature sync with `ADP-` tag filter, `Qx` quarter tag parsing, strict tag enforcement, progress calculator, burnup chart, monthly grouping, quarter-tag-driven program roll-up, program rollup UI, status derivation, deprecation of manual CRUD
- Excluded: Full historical burnup beyond the rolling sprint window, manual milestone creation UI, spike/bug linking to milestones, multi-month Feature handling, backward compatibility with `{MonthAbbr}-Goal` tags

**⚠️ Technical Concerns:**
- Burnup history is limited to sprints in the rolling window (~5 sprints). Features with child stories in older sprints won't have full burnup history — chart will show available data only.
- Features tagged with `ADP-{MON}` but no child UserStories will show 0/0 SP — component needs a graceful empty state.
- ADO Features must be retagged from any legacy format (e.g., `Feb-Goal`) to `ADP-FEB` + `Q4` before the new sync will recognize them.

---

## ADP Monthly Goal Model

- ADO **Features** are tagged with ADP monthly goal identifiers using the strict format `ADP-{MON}` (e.g., `ADP-FEB`, `ADP-MAR`, `ADP-APR`)
- Features also carry a quarter tag in the format `Qx` (e.g., `Q4`) indicating the fiscal quarter they belong to
- **Only tags matching the exact `ADP-{MON}` format are recognized.** All other tags — including legacy formats like `Feb-Goal`, partial matches, or free-text — are strictly ignored.
- Tag is parsed at sync time to derive `targetMonth` (e.g., `ADP-MAR` → `2026-03-01`)
- Quarter tag is parsed separately to derive `quarter` (e.g., `Q4` → `Q4 FY26`)
- Child **User Stories** and their **story points** are the unit of progress
- **% Complete** = Completed SP / Total SP for child stories under the tagged Feature
- Target date = end of the tagged month
- Total SP is a living number — stories may be added mid-month
- Features have a single ADP monthly tag (no multi-month spanning expected) and a single quarter tag

## Tag Parsing

### Monthly ADP Tags

| Tag Value | Target Month | Year Resolution |
|-----------|-------------|-----------------|
| `ADP-JAN` | January | Current year (or next year if month has passed) |
| `ADP-FEB` | February | Current year (or next year if month has passed) |
| `ADP-MAR` | March | Current year (or next year if month has passed) |

Month abbreviations follow standard 3-letter uppercase format: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC.

**Strict parsing rule:** The tag must match `/^ADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i` exactly. Anything else is ignored.

### Quarter Tags

| Tag Value | Quarter | Fiscal Year Mapping |
|-----------|---------|---------------------|
| `Q1` | Q1 (Apr–Jun) | FY27 if current FY is 26 |
| `Q2` | Q2 (Jul–Sep) | FY27 if current FY is 26 |
| `Q3` | Q3 (Oct–Dec) | FY26 |
| `Q4` | Q4 (Jan–Mar) | FY26 |

Quarter tag is parsed with `/^Q[1-4]$/i`. Used for quarterly roll-up grouping — replaces the previous logic of inferring quarter from month.

---

## Data Flow

```
ADO Feature (tagged with ADP-MAR, Q4, etc.)
  ↓  [Feature Goal Sync — area path only, ADP-tag-filtered WIQL]
WorkItem (type=Feature, tags includes "ADP-MAR")
  ↓  [strict tag parse: ADP-{MON} → targetMonth, Qx → quarter]
  ↓  [auto-create/update from sync]
Milestone (adoFeatureId, workstreamId, targetMonth, quarter, status=derived)
  ↓  [progress calculator + deriveMilestoneStatus()]
completedSP, totalSP, burnupData (per sprint), status (NotStarted/InProgress/Done)
  ↓  [GET /api/milestones extended response]
MilestoneGoalsPanel
  ├── Monthly group (current month highlighted)
  │   └── FeatureMilestoneCard
  │         ├── Title, % complete, completedSP/totalSP
  │         └── BurnupChart (cumulative SP vs total per sprint)
  └── Program roll-up (monthly % complete, quarterly counts via Qx tag)
        └── ProgramSummarySection (renders rollup tiles)
```

---

## Detailed Requirements

### 1. Feature Goal Sync — `lib/sync/milestone-features.ts`

Sync module for fetching Features with ADP monthly goal tags from ADO.

**WIQL query per workstream (no iteration filter):**
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.AreaPath] UNDER '{areaPath}'
AND [System.WorkItemType] = 'Feature'
AND [System.Tags] CONTAINS 'ADP-'
ORDER BY [System.Id]
```

**Fields to fetch:** All standard `WORK_ITEM_FIELDS` plus `System.Tags` (already included).

**After upsert to WorkItem:** For each Feature with tags:
- Parse tags strictly: only `ADP-{MON}` format is recognized (e.g., `ADP-MAR` → `2026-03-01`). All non-conforming tags are ignored.
- Parse quarter tag: `Qx` format (e.g., `Q4`). Used for quarterly grouping.
- Upsert a `Milestone` record: `{ adoFeatureId, workstreamId, title, targetMonth, quarter, status: derived }`
- Status derivation: 0% = `NotStarted`, 1–99% = `InProgress`, 100% = `Done`

**Strict enforcement:** Features with tags resembling but not matching the `ADP-{MON}` format (e.g., `Feb-Goal`, `ADP February`, `adp-mar-2026`) are not matched and no Milestone is created.

**Integration:** Called from `lib/sync/orchestrator.ts` as part of the Full sync type.

### 2. Progress Calculator — `lib/milestones/calculator.ts` (new)

Pure functions for computing milestone progress from WorkItem data.

```typescript
export interface MilestoneProgress {
  adoFeatureId: number;
  totalSP: number;
  completedSP: number;
  percentComplete: number | null;  // null if totalSP === 0
  burnupData: BurnupDataPoint[];
}

export interface BurnupDataPoint {
  sprintName: string;
  sprintId: string;
  cumulativeCompletedSP: number;
  totalSP: number;
}
```

**computeMilestoneProgress(featureAdoId, workItems, sprints) → MilestoneProgress**
- Find all WorkItem where `parentAdoId === featureAdoId` and `type === 'UserStory'`
- `totalSP` = sum of `storyPoints` for all child stories
- `completedSP` = sum of `storyPoints` for Done-like states (`'Done'`, `'Closed'`, `'Resolved'`)
- `burnupData` = group completed stories by sprint, cumulate across sprints in order

**computeProgramMilestoneRollup(milestones, progresses) → ProgramMilestoneRollup**
- Monthly completion %: `sum(completedSP) / sum(totalSP)` for current month's milestones
- Quarterly counts: how many milestones are complete (100%), in progress (>0%), not started (0%)

### 3. API Extension — `GET /api/milestones`

Extended response to include progress data:

```typescript
interface ApiMilestoneWithProgress extends ApiMilestone {
  completedPoints: number;
  totalPoints: number;
  percentComplete: number | null;
  burnupData: Array<{
    sprintName: string;
    sprintId: string;
    cumulativeCompletedSP: number;
    totalSP: number;
  }>;
}
```

New program roll-up field added to response wrapper:
```typescript
interface ApiMilestonesResponse {
  milestones: ApiMilestoneWithProgress[];
  programRollup: {
    currentMonth: string;  // "February 2026"
    currentMonthCompletionPercent: number | null;
    currentMonthTotalSP: number;
    currentMonthCompletedSP: number;
    quarterlyMilestones: {
      total: number;
      complete: number;
      inProgress: number;
      notStarted: number;
    };
  };
}
```

Query: Join `Milestone` → `WorkItem` (type=Feature) → child `WorkItem` (type=UserStory, parentAdoId) → `Sprint` for burnup grouping.

### 4. Types — `lib/dashboard/types.ts` additions

```typescript
export interface ApiBurnupPoint {
  sprintName: string;
  sprintId: string;
  cumulativeCompletedSP: number;
  totalSP: number;
}

export interface ApiMilestoneProgress {
  id: string;
  title: string;
  workstreamId: string;
  workstreamName: string;
  targetMonth: string;
  adoFeatureId: number | null;
  completedPoints: number;
  totalPoints: number;
  percentComplete: number | null;
  burnupData: ApiBurnupPoint[];
}

export interface ApiProgramMilestoneRollup {
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

// View models
export interface MilestoneGoalViewModel {
  id: string;
  title: string;
  adoFeatureId: string | null;   // formatted "#12345" or null
  targetMonth: string;           // formatted "February 2026"
  completedPoints: number;
  totalPoints: number;
  percentComplete: string;       // formatted "73%" or "N/A"
  isCurrentMonth: boolean;
  isComplete: boolean;
  burnupData: ApiBurnupPoint[];
}

export interface MilestoneMonthGroup {
  monthLabel: string;            // "February 2026"
  isCurrentMonth: boolean;
  milestones: MilestoneGoalViewModel[];
  groupCompletionPercent: string;
}

// Extend WorkstreamCardViewModel
milestoneGroups: MilestoneMonthGroup[];
```

### 5. Adapter Changes — `lib/dashboard/adapter.ts`

New mapping functions:
- `mapMilestoneToGoalViewModel(m: ApiMilestoneProgress): MilestoneGoalViewModel`
- `groupMilestonesByMonth(milestones: MilestoneGoalViewModel[]): MilestoneMonthGroup[]`
- `mapProgramMilestoneRollup(rollup: ApiProgramMilestoneRollup)` — for Program Summary (feeds 1B)

### 6. Component: `BurnupChart.tsx`

New component: `components/Dashboard/BurnupChart.tsx`

- Accepts `data: ApiBurnupPoint[]`, `title?: string`
- Renders Mantine `AreaChart` (or `LineChart`) with:
  - **Series 1:** `cumulativeCompletedSP` — "Completed SP" (solid line)
  - **Series 2:** `totalSP` — "Target SP" (dashed reference line)
  - **X-axis:** sprint names
  - **Y-axis:** story points
  - **Chart height:** ~160px (compact within milestone card)
- Empty state: render nothing if `data.length === 0`

### 7. Component: `FeatureMilestoneCard.tsx`

New component: `components/Dashboard/FeatureMilestoneCard.tsx`

- Accepts `milestone: MilestoneGoalViewModel`
- Renders:
  - Feature title + ADO ID badge (if present)
  - `{completedPoints} / {totalPoints} SP ({percentComplete})`
  - `BurnupChart` for the milestone
- Highlighted border/background when `isComplete === true`
- Empty state (no child stories): show "No story points tracked" placeholder

### 8. Component: `MilestoneGoalsPanel.tsx`

New component: `components/Dashboard/MilestoneGoalsPanel.tsx`

- Accepts `milestoneGroups: MilestoneMonthGroup[]`, `loading?: boolean`, `error?: string | null`
- Renders month groups in order (current month first, then future, then past)
- Current month group: highlighted header, always expanded
- Past month groups: shown collapsed by default
- Each group: list of `FeatureMilestoneCard` components + group-level completion summary
- Empty state: "No monthly goal Features found for this workstream"

### 9. Dashboard Integration

- Replace `<MilestonePanel>` in `WorkstreamHealthCard.tsx` with `<MilestoneGoalsPanel>`
- Deprecate: `MilestonePanel.tsx`, `MilestoneFormModal.tsx` (keep files, remove from dashboard render)
- `app/dashboard/page.tsx`: Update data fetching to use new `/api/milestones` response shape
- `DashboardContainer.tsx`: Pass `milestoneGroups` through to card view models

---

## Implementation Approach

### Build Order

**Phase 1 (Complete ✅):** Stories 1–6 — Core milestone infrastructure
```
Story 1 → Story 2 → Story 3 → Story 4 → Story 5 + Story 6 (parallel)
```

**Phase 2 (ADP Extension):** Stories 7–10 — ADP tag model + gap fixes
```
Story 7 (ADP Tag Migration)
  → Story 8 (Quarter Tag Parsing) ─┐
  → Story 9 (Status Derivation Fix) ─┤ parallel after 7
  → Story 10 (Program Rollup UI) ───┘
```

### Files Affected

#### Phase 1 (Complete)

| File | Change |
|------|--------|
| `lib/sync/milestone-features.ts` | Feature Goal Sync module |
| `lib/sync/orchestrator.ts` | Milestone feature sync step |
| `lib/milestones/calculator.ts` | Progress computation |
| `lib/milestones/types.ts` | ApiMilestone with progress fields |
| `app/api/milestones/route.ts` | GET response with progress + roll-up |
| `lib/dashboard/types.ts` | Milestone view model types |
| `lib/dashboard/adapter.ts` | Milestone mapping functions |
| `components/Dashboard/BurnupChart.tsx` | Burnup chart component |
| `components/Dashboard/FeatureMilestoneCard.tsx` | Feature card component |
| `components/Dashboard/MilestoneGoalsPanel.tsx` | Goals panel component |
| `components/Dashboard/WorkstreamHealthCard.tsx` | MilestoneGoalsPanel integration |
| `app/dashboard/page.tsx` | Data fetching |
| `components/Dashboard/DashboardContainer.tsx` | Milestone data pass-through |

#### Phase 2 (ADP Extension)

| File | Change |
|------|--------|
| `lib/sync/milestone-features.ts` | Replace `-Goal` WIQL/parsing with `ADP-{MON}` strict format |
| `lib/sync/milestone-features.ts` | Add `parseQuarterTag()` for `Qx` tags |
| `lib/milestones/calculator.ts` | Update `computeProgramMilestoneRollup` for quarter-tag-driven grouping |
| `app/api/milestones/route.ts` | Wire `deriveMilestoneStatus()` into GET handler; add quarter to response |
| `components/Dashboard/FeatureMilestoneCard.tsx` | Fix status check (`'Done'` not `'Complete'`) |
| `components/Dashboard/ProgramSummarySection.tsx` | Surface `programRollup` data in UI |
| `lib/dashboard/types.ts` | Add `quarter` field to view models |
| `lib/dashboard/adapter.ts` | Update rollup mapping for quarter-tag grouping |
| `__tests__/lib/sync/milestone-features.test.ts` | Update tests for `ADP-` format; add strict rejection tests |
| `__tests__/lib/milestones/calculator.test.ts` | Update rollup tests for quarter-tag grouping |
| `__tests__/app/api/milestones/route.test.ts` | Add status derivation + quarter field tests |
