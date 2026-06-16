# Technical Spec: Cycle Time for Stories, Spikes, and Bugs

> **Parent Spec:** `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec.md`
> **Stories:** 1, 2, 3, 4

## Architecture

Cycle-time data should follow the existing sync-to-dashboard path:

1. ADO sync maps lifecycle timestamps onto `WorkItem`.
2. Prisma persists nullable lifecycle fields.
3. Pure metric functions calculate cycle-time aggregates from queried work items.
4. `GET /api/metrics` loads config, queries the rolling window, and returns additive cycle-time fields.
5. `lib/dashboard/adapter.ts` maps API data into display-ready view models.
6. Dashboard components render program and workstream breakdowns.

## Data Model

Add nullable lifecycle timestamp fields to `WorkItem`:

- `adoActivatedDate DateTime?`
- `adoClosedDate DateTime?`

These names intentionally mirror existing `adoCreatedDate` and `adoChangedDate`.

## ADO Sync

Preferred ADO fields:

- `Microsoft.VSTS.Common.ActivatedDate` -> `adoActivatedDate`
- `Microsoft.VSTS.Common.ClosedDate` -> `adoClosedDate`

If these fields are not returned by the current batch request, implementation should first add them to the requested field list if such a list exists. If ADO still does not return reliable lifecycle dates, evaluate revision-history lookup as a sync-layer enhancement and document the performance impact before proceeding.

## Calculation

Cycle-time functions should accept pre-queried work items and config:

- Included types: `UserStory`, `Spike`, `Bug`
- Window basis: done timestamp inside configured rolling window
- Duration: Monday-Friday business days from activated timestamp to closed timestamp
- Missing start or done: exclude from total/average and increment unavailable count

Suggested output shape:

```typescript
type CycleTimeByType = {
  totalBusinessDays: number | null;
  averageBusinessDays: number | null;
  completedItemCount: number;
  unavailableItemCount: number;
};
```

## API Integration

`GET /api/metrics` should add cycle-time data without changing existing fields. Workstream objects and the program object should expose the same by-type structure.

The route should use existing dashboard scope filtering so program and workstream cycle-time metrics agree with selected dashboard/workstream filters.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| ADO lifecycle field fetch | Fields missing from work item payload | Store nulls, count unavailable later; document whether revision lookup is needed | Mapper tests with missing fields |
| ADO revision lookup, if needed | Slower API, partial workstream failures | Keep isolated in sync layer; follow existing per-workstream sync failure behavior | Sync test with injected failure |
| Prisma migration | Existing rows have no lifecycle dates | Nullable fields, no backfill required | Prisma migration/model test |
| Business-day calculation | Dates missing, reversed, or weekend-only | Missing/reversed -> unavailable; weekends excluded by helper | Unit tests for edge dates |
| Config load | Missing cycle-time window config | Use default aligned with existing dashboard rolling-window behavior | Config loader test |
| Config validation | Zero/negative/unsupported window | Reject through existing config validation/API behavior | API validation test |
| Metrics API query | No completed items in window | Return null averages and zero completed counts | Route test |
| Dashboard render | All items unavailable | Show `N/A` plus unavailable count | Component test |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| ADO sync | Lifecycle dates persist | Missing fields persist as null | No matching work items syncs zero rows | Existing sync error/log behavior |
| Calculator | Totals and averages by type | Missing dates counted unavailable | No completed items -> null averages | Not applicable; pure function |
| Metrics API | Program/workstream cycle-time payload returned | Null dates counted unavailable | Empty window -> null/zero counts | 500 with existing API error shape |
| Dashboard | Type breakdown visible | `N/A` plus unavailable count | Empty state formatting | Existing dashboard error state |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Item completed outside configured window but assigned to visible sprint | Excluded; window is based on done timestamp |
| Workstream has only unavailable items | Show `N/A` average and unavailable count |
| Program has one small workstream and one large workstream | Aggregate from item-level totals and counts |
| Config changes while sync is running | Existing recompute/reload behavior applies; newest loaded config drives API response |

## Test Plan

- Unit: business-day helper, by-type aggregation, program aggregation, unavailable counts.
- Sync: mapper and persistence for present/missing lifecycle fields.
- Config: validation and default loading for cycle-time window.
- API: additive response shape, scope filtering, empty window, unavailable counts.
- UI: adapter formatting, program summary, workstream card breakdown, `N/A` rendering.
