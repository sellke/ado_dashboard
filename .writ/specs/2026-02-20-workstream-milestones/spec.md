# Phase 1E: Workstream Milestones Section — Specification

> Created: 2026-02-20
> Status: Planning
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Replace the manual MilestonePanel with an ADO-driven `MilestoneGoalsPanel` — per-workstream display of ADO Features tagged as monthly goals, showing story-point burnup progress per Feature, with a program-level monthly/quarterly roll-up feeding Phase 1B.

**Must Include:**
- New "Feature Goal Sync" step per workstream: WIQL by area path only (no iteration filter), Feature type, tag contains `-Goal`; auto-upserts Features to `WorkItem` table and creates/updates `Milestone` records
- Progress calculation: `completedSP / totalSP` per Feature from child UserStory rows (via `parentAdoId` join), grouped by sprint for burnup
- Per-workstream `MilestoneGoalsPanel`: Features grouped by target month (current month highlighted), burnup chart per Feature using Mantine chart components
- `GET /api/milestones` extended to return progress data (completedSP, totalSP, burnupData)
- Program-level monthly and quarterly roll-up (feeds 1B) — data only, no RAG coloring
- Deprecate manual CRUD (MilestonePanel, MilestoneFormModal) — no longer surfaced on dashboard

**Hardest Constraint:** Features typically have no `iterationPath`, so the existing WIQL query misses them. A separate sync query per workstream (area path only, tag-filtered) is required and must plug into the existing `SyncLog` / orchestrator pattern cleanly.

**Success Criteria:**
- ADO sync fetches tagged Features and creates/updates `Milestone` records with `adoFeatureId` populated
- Progress (completedSP/totalSP) computes correctly from child UserStories already in the database
- Burnup chart renders per Feature showing sprint-by-sprint cumulative completed SP vs. total SP
- Monthly grouping correctly uses the `-Goal` tag to determine target month (e.g., `Feb-Goal` → February 2026)
- Program-level roll-up calculates `monthly completion %` and quarterly milestone counts

**Scope Boundaries:**
- Included: Feature sync with tag filter, progress calculator, burnup chart, monthly grouping, program roll-up, deprecation of manual CRUD
- Excluded: Full historical burnup beyond the rolling sprint window, manual milestone creation UI, spike/bug linking to milestones, multi-month Feature handling

**⚠️ Technical Concerns:**
- Burnup history is limited to sprints in the rolling window (~5 sprints). Features with child stories in older sprints won't have full burnup history — chart will show available data only.
- Features tagged with `-Goal` but no child UserStories will show 0/0 SP — component needs a graceful empty state.

---

## Monthly Goal Model

- ADO **Features** are tagged with monthly goal identifiers using the format `{MonthAbbr}-Goal` (e.g., `Feb-Goal`, `Mar-Goal`, `Apr-Goal`)
- Tag is parsed at sync time to derive `targetMonth` (e.g., `Feb-Goal` → `2026-02-01`)
- Child **User Stories** and their **story points** are the unit of progress
- **% Complete** = Completed SP / Total SP for child stories under the tagged Feature
- Target date = end of the tagged month
- Total SP is a living number — stories may be added mid-month
- Features have a single monthly goal tag (no multi-month spanning expected)

## Tag Parsing

| Tag Value | Target Month | Year Resolution |
|-----------|-------------|-----------------|
| `Feb-Goal` | February | Current year (or next year if month has passed) |
| `Mar-Goal` | March | Current year (or next year if month has passed) |
| `Apr-Goal` | April | Current year (or next year if month has passed) |

Month abbreviations follow standard 3-letter format (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec).

---

## Data Flow

```
ADO Feature (tagged with Feb-Goal, Mar-Goal, etc.)
  ↓  [Feature Goal Sync — area path only, tag-filtered WIQL]
WorkItem (type=Feature, tags includes "Feb-Goal")
  ↓  [auto-create/update from sync]
Milestone (adoFeatureId, workstreamId, targetMonth from tag, status=derived)
  ↓  [progress calculator]
completedSP, totalSP, burnupData (per sprint)
  ↓  [GET /api/milestones extended response]
MilestoneGoalsPanel
  ├── Monthly group (current month highlighted)
  │   └── FeatureMilestoneCard
  │         ├── Title, % complete, completedSP/totalSP
  │         └── BurnupChart (cumulative SP vs total per sprint)
  └── Program roll-up (monthly % complete, quarterly counts)
```

---

## Detailed Requirements

### 1. Feature Goal Sync — `lib/sync/milestone-features.ts` (new)

New sync module for fetching Features with monthly goal tags from ADO.

**WIQL query per workstream (no iteration filter):**
```sql
SELECT [System.Id] FROM WorkItems
WHERE [System.AreaPath] UNDER '{areaPath}'
AND [System.WorkItemType] = 'Feature'
AND [System.Tags] CONTAINS '-Goal'
ORDER BY [System.Id]
```

**Fields to fetch:** All standard `WORK_ITEM_FIELDS` plus `System.Tags` (already included).

**After upsert to WorkItem:** For each Feature that has a `-Goal` tag:
- Parse the tag to derive `targetMonth` (e.g., `Feb-Goal` → `2026-02-01`)
- Upsert a `Milestone` record: `{ adoFeatureId, workstreamId, title, targetMonth, status: derived }`
- Status derivation: 0% = `NotStarted`, 1–99% = `InProgress`, 100% = `Done`

**Integration:** Called from `lib/sync/orchestrator.ts` as part of the Full sync type (or as a new `Milestones` sync type).

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

Story 1 → Story 2 → Story 3 → Story 4 → Story 5 + Story 6 (parallel)

### Files Affected

| File | Change |
|------|--------|
| `lib/sync/milestone-features.ts` | New — Feature Goal Sync module |
| `lib/sync/orchestrator.ts` | Add milestone feature sync step |
| `lib/milestones/calculator.ts` | New — progress computation |
| `lib/milestones/types.ts` | Extend ApiMilestone with progress fields |
| `app/api/milestones/route.ts` | Extend GET response with progress + roll-up |
| `lib/dashboard/types.ts` | New milestone view model types |
| `lib/dashboard/adapter.ts` | New milestone mapping functions |
| `components/Dashboard/BurnupChart.tsx` | New component |
| `components/Dashboard/FeatureMilestoneCard.tsx` | New component |
| `components/Dashboard/MilestoneGoalsPanel.tsx` | New component |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Replace MilestonePanel with MilestoneGoalsPanel |
| `app/dashboard/page.tsx` | Update data fetching |
| `components/Dashboard/DashboardContainer.tsx` | Pass milestone data through |
| `__tests__/lib/milestones/calculator.test.ts` | New test file |
| `__tests__/app/api/milestones/route.test.ts` | Update for new response shape |
