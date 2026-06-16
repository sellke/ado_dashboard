# Story 2: Calculate Cycle-Time Aggregates

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a team lead, I want cycle time calculated consistently by work item type so that I can compare how long stories, spikes, and bugs take to complete.

## Acceptance Criteria

- Given completed work items with lifecycle dates, when cycle time is calculated, then total and average business days are returned by `UserStory`, `Spike`, and `Bug`.
- Given an item is missing start or done date, when calculation runs, then the item is excluded from totals and averages and counted as unavailable.
- Given weekend dates fall between start and done, when business days are calculated, then Saturday and Sunday are excluded.
- Given program-level data spans multiple workstreams, when average cycle time is calculated, then it uses item-level totals and counts instead of averaging workstream averages.

## Implementation Tasks

- [x] Define cycle-time input and output types in `lib/metrics/types.ts` or a dedicated cycle-time module.
- [x] Implement a pure business-day duration helper with Monday-Friday behavior.
- [x] Implement work item filtering by done date, type, and configured window.
- [x] Aggregate total business days, average business days, completed item count, and unavailable item count by type.
- [x] Add program aggregation that sums item-level totals and counts.
- [x] Add unit tests for business-day math, unavailable data, empty inputs, and program aggregation.
- [x] Document the calculation rules in metric definition copy if existing tooltip patterns apply.

## Technical Notes

- Keep calculators pure: no Prisma imports and no dashboard formatting.
- Return `null` for averages when no available completed items exist.
- Treat invalid date ordering as unavailable unless implementation finds a stronger invariant in synced ADO data.

## Definition of Done

- [x] Cycle-time calculator returns stable by-type aggregates.
- [x] Business-day rules are covered by tests.
- [x] Program aggregation cannot be skewed by averaging workstream averages.
- [x] Unavailable counts are part of the calculation output.

## Context for Agents

- See `spec.md` -> `## Detailed Requirements` -> `### Metric Calculation`.
- Relevant files: `lib/metrics/calculators.ts`, `lib/metrics/types.ts`, `__tests__/lib/metrics/*`.
- Existing pattern: `calculateVelocity`, `calculateOverhead`, `calculatePredictability`, and `calculateCarryOver` are pure calculator functions.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

[None created]

### Files Modified

- **`lib/metrics/types.ts`**
  - Added cycle-time work item, window, by-type breakdown, workstream result, and program result types.
- **`lib/metrics/calculators.ts`**
  - Added inclusive Monday-Friday business-day helper and pure cycle-time aggregation for program and workstream scopes.
- **`lib/metrics/definitions.ts`**
  - Added tooltip registry entries for total and average cycle-time rules.
- **`__tests__/lib/metrics/calculators.test.ts`**
  - Covered same-day, weekend, missing/reversed dates, window/type filtering, empty input, unavailable counts, and item-level program aggregation.
- **`__tests__/lib/metrics/definitions.test.ts`**
  - Locked cycle-time tooltip coverage in the metric definition registry.

### Implementation Decisions

1. **Inclusive business-day counting** — Same-day start/done spans count as one business day, weekend-only spans count as zero, and Friday-to-Monday spans count Friday plus Monday.
2. **Done-date window scoping** — Items with a done date outside the supplied window are excluded; items missing lifecycle dates are counted as unavailable within the pre-queried input scope.
3. **Item-level program aggregation** — Program averages are calculated from summed item totals and counts, avoiding skew from averaging workstream averages.

### Test Results

**Verification:** `pnpm run typecheck`; `pnpm jest __tests__/lib/metrics/calculators.test.ts __tests__/lib/metrics/definitions.test.ts --runInBand`
- ✅ TypeScript typecheck passed.
- ✅ Focused metric suites passed: 73/73 tests.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 review iteration
- **Drift:** Low
- **Security:** No concerns
- **Boundary Compliance:** Story 2 changes stayed within metric calculator/type/definition and focused test files.

### Deviations from Spec

None
