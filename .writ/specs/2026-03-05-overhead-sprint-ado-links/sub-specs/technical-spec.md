# Technical Specification: Overhead Sprint-Selectable ADO Links

## Architecture Overview

This feature modifies the existing data pipeline without adding new endpoints or database changes. The existing metrics API already fetches bug, spike, and support work items for the rolling 5-sprint window. The change restructures the API response to expose per-sprint overhead items (currently only current-sprint items are returned) and adds ADO URLs to the view model.

## Data Flow

```
Prisma DB (WorkItem table)
  ↓ (already queried for trendBugs, trendSpikes, trendSupport)
app/api/metrics/route.ts
  ↓ (restructured: overheadItemsBySprint[] replaces currentSprintOverheadItems)
lib/dashboard/types.ts (ApiOverheadItemsBySprint)
  ↓
lib/dashboard/adapter.ts (mapOverheadItem + buildAdoWorkItemUrl)
  ↓
lib/dashboard/types.ts (OverheadSprintViewModel, OverheadItemViewModel with adoUrl)
  ↓
WorkstreamCardsGrid (owns activeSprintId state via SprintTabSelector)
  ↓
WorkstreamHealthCard (passes activeSprintId + overheadItemsBySprint)
  ↓
OverheadBreakdownPanel (finds selected sprint)
  ↓
CurrentSprintItemTables (renders Bugs/Spikes/Support with Anchor links)
```

## Type Changes

### New Types

```typescript
// API response shape (per-sprint grouping)
interface ApiOverheadItemsBySprint {
  sprintId: string;
  bugs: ApiOverheadItem[];
  spikes: ApiOverheadItem[];
  support: ApiOverheadItem[];
}

// View model shape (per-sprint grouping with mapped items)
interface OverheadSprintViewModel {
  sprintId: string;
  bugs: OverheadItemViewModel[];
  spikes: OverheadItemViewModel[];
  support: OverheadItemViewModel[];
}
```

### Modified Types

```typescript
// OverheadItemViewModel — add adoUrl
interface OverheadItemViewModel {
  adoId: string;      // Display format: "#12345"
  title: string;
  state: string;
  hours: string;
  isClosed: boolean;
  adoUrl: string;     // NEW: "https://dev.azure.com/.../edit/12345"
}

// ApiWorkstream — replace currentSprintOverheadItems
interface ApiWorkstream {
  // ... existing fields ...
  overheadItemsBySprint?: ApiOverheadItemsBySprint[];  // REPLACES currentSprintOverheadItems
}

// WorkstreamCardViewModel — replace flat arrays
interface WorkstreamCardViewModel {
  // ... existing fields ...
  overheadItemsBySprint: OverheadSprintViewModel[];  // REPLACES currentSprintBugItems + currentSprintSupportItems
}
```

## API Response Shape Change

### Before

```json
{
  "workstreams": [{
    "currentSprintOverheadItems": {
      "bugs": [{ "adoId": 123, "title": "...", "state": "Active", "hours": 4 }],
      "support": [{ "adoId": 456, "title": "...", "state": "Closed", "hours": 2 }]
    }
  }]
}
```

### After

```json
{
  "workstreams": [{
    "overheadItemsBySprint": [
      {
        "sprintId": "sprint-5",
        "bugs": [{ "adoId": 123, "title": "...", "state": "Active", "hours": 4 }],
        "spikes": [{ "adoId": 789, "title": "...", "state": "New", "hours": null }],
        "support": [{ "adoId": 456, "title": "...", "state": "Closed", "hours": 2 }]
      },
      {
        "sprintId": "sprint-4",
        "bugs": [],
        "spikes": [],
        "support": []
      }
    ]
  }]
}
```

## Component Prop Changes

### OverheadBreakdownPanel

```typescript
// Before
interface OverheadBreakdownPanelProps {
  trendSprints: TrendSprintViewModel[];
  bugItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}

// After
interface OverheadBreakdownPanelProps {
  trendSprints: TrendSprintViewModel[];
  overheadItemsBySprint: OverheadSprintViewModel[];
  activeSprintId: string;
}
```

### CurrentSprintItemTables

```typescript
// Before
interface CurrentSprintItemTablesProps {
  bugItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}

// After
interface CurrentSprintItemTablesProps {
  bugItems: OverheadItemViewModel[];
  spikeItems: OverheadItemViewModel[];
  supportItems: OverheadItemViewModel[];
}
```

## ADO URL Construction

Uses existing `buildAdoWorkItemUrl` from `lib/ado/urls.ts`:

```typescript
const ADO_BASE_URL = 'https://dev.azure.com/Operations-Innovation/Event%20Streaming%20Platform';

function buildAdoWorkItemUrl(adoId: number): string {
  return `${ADO_BASE_URL}/_workitems/edit/${adoId}`;
}
```

Called during adapter mapping — the numeric `adoId` from the API is passed to `buildAdoWorkItemUrl` before being formatted as `#${adoId}` for display.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Larger API payload (5 sprints × 3 categories vs 1 sprint × 2 categories) | Minor latency increase | Data is already fetched; only serialization cost. Negligible for typical overhead item counts (5-15 per category per sprint). |
| Sprint selector not yet mounted when overhead renders | Items for empty `activeSprintId` | Fallback to empty arrays when `activeSprintId` is empty or sprint not found in array (same pattern as SprintStoryListPanel). |
| `isClosed` logic for spikes/support | Incorrect styling | Bugs use `BUG_RESOLVED_STATES`; spikes and support should use a generic closed check (e.g., state includes "Closed" or "Done"). Review actual spike/support states in the database. |

## Files Modified

| File | Change Type | Story |
|------|-------------|-------|
| `app/api/metrics/route.ts` | Modified | 1 |
| `lib/dashboard/types.ts` | Modified | 2 |
| `lib/dashboard/adapter.ts` | Modified | 2 |
| `components/Dashboard/WorkstreamHealthCard.tsx` | Modified | 3 |
| `components/Dashboard/OverheadBreakdownPanel.tsx` | Modified | 3 |
| `components/Dashboard/CurrentSprintItemTables.tsx` | Modified | 3 |
| `__tests__/app/api/metrics/route.test.ts` | Modified | 1 |
| `__tests__/lib/dashboard/adapter.test.ts` | Modified | 2 |
| `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` | Modified | 3 |
| `__tests__/components/Dashboard/OverheadBreakdownPanel.test.tsx` | Modified | 3 |
| `__tests__/components/Dashboard/CurrentSprintItemTables.test.tsx` | Modified | 3 |
