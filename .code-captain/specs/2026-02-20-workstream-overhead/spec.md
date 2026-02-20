# Phase 1D: Workstream Overhead Section — Specification

> Created: 2026-02-20
> Status: Planning
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Add an `OverheadBreakdownPanel` to each `WorkstreamHealthCard` — a stacked bar chart showing ceremony/bug/spike/support hour composition per sprint across the rolling window, plus inline tables of bug and support work items (with hours) for the currently-displayed sprint.

**Must Include:**
- Stacked bar chart (Mantine `BarChart`) per workstream showing overhead composition by category across rolling sprints
- Bug item table for the current sprint: ADO ID, title, hours, state
- Support item table for the current sprint: ADO ID, title, hours, state
- Spike hours represented in chart only (no individual item listing)
- New MetricSnapshot schema columns: `ceremonyHours`, `bugHours`, `spikeHours`, `supportHours` — populated during compute, used for chart data
- DB migration for the new columns

**Hardest Constraint:** MetricSnapshot currently stores only total `overheadHours`. Adding per-category columns requires touching 4 layers: schema migration → calculator return type → orchestrator persistence → API response.

**Success Criteria:**
- Each `WorkstreamHealthCard` renders the `OverheadBreakdownPanel` below the velocity section (always visible)
- Stacked bar chart renders ceremony/bug/spike/support layers for all rolling sprints with correct hours
- Bug and support item tables show for the currently-displayed sprint with hours
- Calculator update validated by existing and new unit tests
- All new components have unit tests

**Scope Boundaries:**
- Included: Stacked bar composition chart, bug/support item tables with hours, MetricSnapshot breakdown columns, schema migration
- Excluded: Spike item listing (hours in chart only), sprint selector dropdown (MVP shows current sprint), item pagination (deferred)

---

## Calculation Rules

| Component | Source | Calculation |
|---|---|---|
| **Ceremony Hours** | `SprintWorkstream.ceremonyHours` | 10.25 hrs × active developer/tester count, pre-computed during sync |
| **Bug Hours** | ADO Bug work items | `completedWork ?? originalEstimate ?? 0` per item |
| **Support Hours** | ADO Support work items | `completedWork ?? originalEstimate ?? 0` per item |
| **Spike Hours** | ADO Spike work items | `storyPoints × 1` (1 SP = 1 hr) |
| **Overhead %** | Derived | `(ceremony + bug + spike + support) / grossHours × 100` |

> These rules already match the existing `calculateOverhead()` implementation in `lib/metrics/calculators.ts`. The update adds the per-category breakdown to the return type.

---

## Detailed Requirements

### 1. Schema Migration — MetricSnapshot Breakdown Columns

Add four new nullable `Float?` columns to `MetricSnapshot`:

| Column | Type | Description |
|---|---|---|
| `ceremonyHours` | `Float?` | Hours from ceremony (10.25 × FTE) |
| `bugHours` | `Float?` | Total hours from Bug work items |
| `spikeHours` | `Float?` | Total hours from Spike work items (SP × 1) |
| `supportHours` | `Float?` | Total hours from Support work items |

- Sum of `ceremonyHours + bugHours + spikeHours + supportHours` == `overheadHours`
- Columns are nullable for backwards compatibility with existing snapshots
- A Prisma migration is required

### 2. Calculator Update — `OverheadResult` Breakdown

Update `calculateOverhead()` in `lib/metrics/calculators.ts` to return per-category hours:

```typescript
// Current OverheadResult
{ overheadHours: number; overheadPercent: number | null }

// Updated OverheadResult
{
  overheadHours: number;
  overheadPercent: number | null;
  ceremonyHours: number;
  bugHours: number;
  spikeHours: number;
  supportHours: number;
}
```

- No calculation logic changes — only the return shape expands
- Update `OverheadResult` type in `lib/metrics/types.ts`
- Update all tests for `calculateOverhead()` to verify breakdown fields

### 3. Orchestrator Update — Persist Breakdown

Update `lib/metrics/orchestrator.ts` to persist the new breakdown fields when upserting a MetricSnapshot:

```typescript
// Add to upsert data:
ceremonyHours: overhead.ceremonyHours,
bugHours:      overhead.bugHours,
spikeHours:    overhead.spikeHours,
supportHours:  overhead.supportHours,
```

### 4. API Contract Extension

Extend `GET /api/metrics` to include per-sprint overhead composition and current-sprint item lists.

#### Per-sprint overhead composition (new field on `ApiTrendSprint`)

```typescript
// Extended ApiTrendSprint
overheadComposition?: {
  ceremonyHours: number | null;
  bugHours: number | null;
  spikeHours: number | null;
  supportHours: number | null;
  totalOverheadHours: number | null;
  overheadPercent: number | null;
}
```

Data sourced from `MetricSnapshot` breakdown columns (queried alongside the existing `trendSnapshots`).

#### Current-sprint overhead items (new field on `ApiWorkstream`)

```typescript
// New field on ApiWorkstream
currentSprintOverheadItems?: {
  bugs: Array<{
    adoId: number;
    title: string;
    state: string;
    hours: number | null;  // completedWork ?? originalEstimate ?? null
  }>;
  support: Array<{
    adoId: number;
    title: string;
    state: string;
    hours: number | null;
  }>;
}
```

Items are filtered to the sprint shown in the response (same `sprintId` used for the snapshot). Ordered by `adoId` ascending.

### 5. Type Changes — `lib/dashboard/types.ts`

New and extended types:

```typescript
// New: per-sprint composition shape
export interface ApiOverheadComposition {
  ceremonyHours: number | null;
  bugHours: number | null;
  spikeHours: number | null;
  supportHours: number | null;
  totalOverheadHours: number | null;
  overheadPercent: number | null;
}

// Extend ApiTrendSprint
overheadComposition?: ApiOverheadComposition;

// New: current-sprint overhead item
export interface ApiOverheadItem {
  adoId: number;
  title: string;
  state: string;
  hours: number | null;
}

// Extend ApiWorkstream
currentSprintOverheadItems?: {
  bugs: ApiOverheadItem[];
  support: ApiOverheadItem[];
};

// New: view model for overhead composition per sprint (for chart)
export interface OverheadCompositionViewModel {
  sprintName: string;
  ceremonyHours: number;
  bugHours: number;
  spikeHours: number;
  supportHours: number;
  overheadPercent: string;
}

// New: view model for an overhead item (bug or support)
export interface OverheadItemViewModel {
  adoId: string;       // formatted as "#12345"
  title: string;
  state: string;
  hours: string;       // formatted as "4.5 hrs" or "N/A"
  isClosed: boolean;
}

// Extend WorkstreamCardViewModel
overheadComposition: OverheadCompositionViewModel[];
currentSprintBugItems: OverheadItemViewModel[];
currentSprintSupportItems: OverheadItemViewModel[];
```

### 6. Adapter Changes — `lib/dashboard/adapter.ts`

New mapping functions:

- `mapOverheadComposition(trendSprints: ApiTrendSprint[]): OverheadCompositionViewModel[]` — maps composition data for the chart
- `mapOverheadItem(item: ApiOverheadItem): OverheadItemViewModel` — formats adoId, hours, isClosed
- Extend `mapApiResponseToDashboardViewModel` to populate the new `WorkstreamCardViewModel` fields

### 7. Component: `OverheadCompositionChart.tsx`

New component: `components/Dashboard/OverheadCompositionChart.tsx`

- Accepts `composition: OverheadCompositionViewModel[]`
- Renders Mantine `BarChart` with `type="stacked"`
- **Series:**
  - Ceremony (e.g., blue)
  - Bugs (e.g., red)
  - Spikes (e.g., orange)
  - Support (e.g., yellow)
- **X-axis:** Sprint names
- **Y-axis:** Hours
- **Chart height:** ~200px (compact within card)
- **Empty state:** Renders nothing if no composition data

### 8. Component: `CurrentSprintItemTables.tsx`

New component: `components/Dashboard/CurrentSprintItemTables.tsx`

- Accepts `bugItems: OverheadItemViewModel[]` and `supportItems: OverheadItemViewModel[]`
- Renders two sections:
  - **Bugs** heading + list (ADO ID, title, hours, state) — closed items shown with strikethrough
  - **Support** heading + list (same format)
- Each item: `#12345 — Title (X hrs) [State]`
- Empty state per section: "No bug items" / "No support items"
- Uses `Box`, `Text` from Mantine (consistent with `SprintBugList`)

### 9. Component: `OverheadBreakdownPanel.tsx`

New umbrella component: `components/Dashboard/OverheadBreakdownPanel.tsx`

- Accepts `composition: OverheadCompositionViewModel[]`, `bugItems: OverheadItemViewModel[]`, `supportItems: OverheadItemViewModel[]`
- Renders a labeled section header ("Overhead Breakdown") with a divider
- Contains `OverheadCompositionChart` + `CurrentSprintItemTables`
- No collapsing — always visible inline in the card

### 10. `WorkstreamHealthCard.tsx` Integration

- Import and render `OverheadBreakdownPanel` below the `SprintBugList` section
- Pass `card.overheadComposition`, `card.currentSprintBugItems`, `card.currentSprintSupportItems`
- Conditional render: only show panel when composition data or items are present

---

## Implementation Approach

### Data Flow

```
WorkItem (DB) + SprintWorkstream (DB) + MetricSnapshot (DB)
  ↓
calculateOverhead() → now returns ceremony/bug/spike/support breakdown
  ↓
orchestrator.ts → upserts breakdown to MetricSnapshot
  ↓
GET /api/metrics (extended response)
  ↓  adds: per-sprint overheadComposition + currentSprintOverheadItems
adapter.ts (maps to view models)
  ↓  maps: OverheadCompositionViewModel[] + OverheadItemViewModel[]
WorkstreamHealthCard
  └── OverheadBreakdownPanel
        ├── OverheadCompositionChart (stacked bar)
        └── CurrentSprintItemTables (bug + support tables)
```

### Build Order

Story 1 → Story 2 → Story 3 → Story 4 + Story 5 (parallel) → Story 6

### Files Affected

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add 4 breakdown columns to MetricSnapshot |
| `prisma/migrations/` | New migration file |
| `lib/metrics/types.ts` | Extend `OverheadResult` |
| `lib/metrics/calculators.ts` | Return breakdown in `calculateOverhead()` |
| `lib/metrics/orchestrator.ts` | Persist breakdown fields |
| `app/api/metrics/route.ts` | Add composition + items to response |
| `lib/dashboard/types.ts` | New API + view model types |
| `lib/dashboard/adapter.ts` | New mapping functions |
| `components/Dashboard/OverheadCompositionChart.tsx` | New component |
| `components/Dashboard/CurrentSprintItemTables.tsx` | New component |
| `components/Dashboard/OverheadBreakdownPanel.tsx` | New umbrella component |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Integration |
| `__fixtures__/dashboard-fixtures.ts` | Add overhead fixture data |
