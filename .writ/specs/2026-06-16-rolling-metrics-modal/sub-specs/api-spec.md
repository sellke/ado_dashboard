# API Spec: Rolling Metric Drilldown Data

> **Parent Spec:** `.writ/specs/2026-06-16-rolling-metrics-modal/spec.md`
> **Primary Story:** Story 1

## Existing Endpoint

The feature should use the existing dashboard metrics endpoint:

```text
GET /api/metrics
```

Do not add a separate modal endpoint unless implementation discovery proves the primary response
cannot carry the required data without unacceptable payload growth.

## Additive Response Requirements

Existing trend sprint fields already support most modal rows:

- `velocityRate`
- `velocityAvg`
- `overheadPercentAvg`
- `carryOverRateAvg`
- `plannedPoints`
- `completedPoints`
- `carryOverPoints`
- `grossHours`
- overhead composition data for actual overhead %

If program-level per-sprint delivery-to-bug values are not already present, add additive fields to
the program trend sprint data. Suggested fields:

```typescript
interface ApiTrendSprint {
  deliveryToBugRatio?: number | null;
  deliveryToBugRag?: 'Green' | 'Amber' | 'Red' | null;
}
```

The exact names may follow local conventions, but they must be documented in
`lib/dashboard/types.ts` and mapped by `lib/dashboard/adapter.ts`.

## Calculation Source

Delivery-to-bug values must follow the completed delivery-to-bug spec:

- Numerator: completed delivery story points, using the established `1 SP = 1 hour` convention.
- Denominator: bug hours.
- Program aggregation: sum numerator and denominator, then divide.
- Zero-bug behavior: preserve existing display and RAG semantics.

## Compatibility

- Existing dashboard consumers should continue to work if they ignore the new fields.
- Existing tile-level program `deliveryToBugRatio` and `deliveryToBugRag` remain unchanged.
- No schema migration is planned.

## Test Requirements

- Route tests verify delivery-to-bug trend fields when enough source data exists.
- Route tests verify null/zero-bug handling.
- Adapter tests verify the modal row mapping from API fields to display values.
