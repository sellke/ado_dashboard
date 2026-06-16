# API Sub-Spec

> **Parent Spec:** `.writ/specs/2026-06-15-cycle-time-stories-spikes-bugs/spec.md`
> **Stories:** 3, 4

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
