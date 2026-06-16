# API Sub-Spec

> **Parent Spec:** `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec.md`
> **Stories:** 3, 4, 5

## Endpoint

Extend existing endpoint:

```http
GET /api/metrics
```

The change must be additive. Existing response fields remain unchanged.

## Proposed Shape

Workstream payload:

```typescript
type CycleTimeTypeBreakdown = {
  totalBusinessDays: number | null;
  averageBusinessDays: number | null;
  completedItemCount: number;
  unavailableItemCount: number;
};

type CycleTimeMetrics = {
  window: {
    value: number;
    unit: 'sprints' | 'businessDays' | 'calendarDays';
  };
  byType: {
    userStory: CycleTimeTypeBreakdown;
    spike: CycleTimeTypeBreakdown;
    bug: CycleTimeTypeBreakdown;
  };
};
```

Add to each workstream response:

```typescript
{
  cycleTime: CycleTimeMetrics;
}
```

Add to program response:

```typescript
{
  cycleTime: CycleTimeMetrics;
}
```

## Window Semantics

The locked product direction is configurable rolling window. Implementation should reuse existing metric configuration patterns and choose the narrowest compatible unit. If the current config model already treats rolling windows as sprint counts, prefer `unit: 'sprints'` for v1.

## Empty and Missing Data

- No completed items in window: `averageBusinessDays: null`, `totalBusinessDays: null`, `completedItemCount: 0`.
- Missing lifecycle dates: increment `unavailableItemCount`; do not include in totals or averages.
- Some available and some unavailable items: compute totals and averages from available items only and include unavailable count.

## Unavailable Item Drilldown Endpoint

Add a focused read endpoint for Story 5. Exact route naming may follow project conventions, but the endpoint should be scoped to unavailable cycle-time items rather than expanding the primary metrics payload.

Recommended shape:

```http
GET /api/metrics/cycle-time/unavailable
```

Query parameters:

- `type`: required, one of `UserStory`, `Spike`, `Bug`
- `dashboard`: optional, same semantics as `GET /api/metrics`
- `workstreamIds`: optional, same saved/dashboard scope semantics as `GET /api/metrics`
- `workstreamId`: optional, narrows to a single workstream for workstream-card drilldown
- `sprintId`: optional, matches the selected sprint/window anchor used by `GET /api/metrics`

Response shape:

```typescript
type UnavailableCycleTimeItem = {
  adoId: number;
  adoUrl: string;
  title: string;
  type: 'UserStory' | 'Spike' | 'Bug';
  workstreamId: string | null;
  workstreamName: string | null;
};

type UnavailableCycleTimeResponse = {
  type: 'UserStory' | 'Spike' | 'Bug';
  scope: 'program' | 'workstream';
  count: number;
  items: UnavailableCycleTimeItem[];
};
```

Endpoint rules:

- Reuse the same configured cycle-time rolling window as `GET /api/metrics`.
- Reuse the same dashboard/workstream scope filtering semantics as the aggregate cycle-time metrics.
- Return only items that contribute to `unavailableItemCount` for the selected type and scope.
- Do not include PATs, credential material, or raw ADO auth data.

## Backward Compatibility

- Do not rename existing `metrics`, `detail`, `trends`, `prediction`, or `overheadItemsBySprint` fields.
- Do not require clients to pass new query params.
- If config loading fails, follow existing recoverable config fallback patterns where available; otherwise return the existing API error shape.

## Tests

- Route returns cycle-time shape for workstream and program payloads.
- Program values are item-weighted, not average-of-averages.
- Empty window returns null averages and zero completed counts.
- Missing lifecycle fields increment unavailable counts.
- Existing response fields remain present.
- Unavailable drilldown endpoint count matches the corresponding aggregate badge count.
- Unavailable drilldown returns linked ADO IDs and titles for all supported cycle-time types.
