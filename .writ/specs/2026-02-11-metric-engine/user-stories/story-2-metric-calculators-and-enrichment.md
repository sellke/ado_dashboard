# Story 2: Metric Calculators & Enrichment

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1 (types.ts)

## User Story

**As a** metric calculation engine
**I want to** have pure functions that compute all 4 metrics, assign RAG colors, calculate rolling averages, and aggregate to program level
**So that** all computation logic is accurate, testable, and free of side effects

## Acceptance Criteria

- [x] Given WorkItems for a sprint+workstream, when `calculateVelocity()` is called, then it returns the sum of storyPoints for items in Closed/Done/Resolved states ✅
- [x] Given WorkItems + SprintWorkstream, when `calculateOverhead()` is called, then it returns (ceremonyHours + bugHours + spikeHours + supportHours) / grossHours × 100 ✅
- [x] Given WorkItems for a sprint+workstream, when `calculatePredictability()` is called, then it returns completedPoints / plannedPoints × 100 ✅
- [x] Given WorkItems for a sprint+workstream, when `calculateCarryOver()` is called, then it returns carry-over items count, points, and rate ✅
- [x] Given a metric value and ThresholdConfig, when `assignRag()` is called, then it returns the correct Green/Amber/Red color ✅
- [x] Given velocity and its rolling average, when `assignVelocityRag()` is called, then it returns trend-based RAG (Green ≥ avg, Amber 70–99%, Red < 70%) ✅
- [x] Given prior MetricSnapshot records, when `calculateRollingAverages()` is called, then it returns arithmetic means of prior 4 sprints ✅
- [x] Given per-workstream metrics, when `aggregateToProgram()` is called, then it returns weighted averages by story points ✅

## Implementation Tasks

- [x] 2.1 Write tests for all 4 calculators in `__tests__/lib/metrics/calculators.test.ts`: velocity (normal, no items, all incomplete, null SP, mixed states), overhead (normal, null grossHours, zero grossHours, null ceremonyHours, Bug completedWork, Bug originalEstimate fallback, Spike SP→hours, Support fallback), predictability (normal, 0 planned, >100%, null SP), carry-over (normal, all complete, all incomplete, null SP, 0 planned) ✅
- [x] 2.2 Implement `calculators.ts` — `calculateVelocity()`, `calculateOverhead()`, `calculatePredictability()`, `calculateCarryOver()` in `lib/metrics/calculators.ts` ✅
- [x] 2.3 Write tests for RAG functions in `__tests__/lib/metrics/rag.test.ts`: threshold-based (green, amber, red, null value, missing config), velocity trend (≥ avg, 70-99%, < 70%, null avg, avg=0) ✅
- [x] 2.4 Implement `rag.ts` — `assignRag()` and `assignVelocityRag()` in `lib/metrics/rag.ts` ✅
- [x] 2.5 Write tests for rolling averages in `__tests__/lib/metrics/rolling.test.ts`: 4 prior sprints, fewer than 4, no priors, null metrics in some sprints ✅
- [x] 2.6 Implement `rolling.ts` — `calculateRollingAverages()` in `lib/metrics/rolling.ts` ✅
- [x] 2.7 Write tests for program aggregation in `__tests__/lib/metrics/aggregator.test.ts`: 4 workstreams, some null metrics, all zero SP, single workstream ✅
- [x] 2.8 Implement `aggregator.ts` — `aggregateToProgram()` in `lib/metrics/aggregator.ts` ✅

## Notes

**All functions in this story are pure — no database access, no side effects.** They receive pre-queried data as arguments and return computed results.

**Done-like states constant:**
```typescript
const DONE_STATES = ['Closed', 'Done', 'Resolved'] as const;
```

**Overhead hour sources:**
| Type | Hours Source |
|------|-------------|
| Bug | `completedWork ?? originalEstimate ?? 0` |
| Spike | `storyPoints * 1.0` (1 SP = 1 hour) |
| Support | `completedWork ?? originalEstimate ?? 0` |
| Ceremony | `SprintWorkstream.ceremonyHours ?? 0` |
| Denominator | `SprintWorkstream.grossHours` (null/0 → return null) |

**RAG assignment (threshold-based):**
```typescript
function assignRag(value, metricName, thresholds): RagColor {
  if (value === null) return null;
  const config = thresholds.find(t => t.metricName === metricName);
  if (!config) return null;
  if (value >= config.greenMin && value <= config.greenMax) return 'Green';
  if (value >= config.amberMin && value <= config.amberMax) return 'Amber';
  return 'Red';
}
```

**Velocity RAG (trend-based):**
```typescript
function assignVelocityRag(velocity, rollingAvg): RagColor {
  if (velocity === null || rollingAvg === null) return null;
  if (rollingAvg === 0) return velocity > 0 ? 'Green' : null;
  const ratio = velocity / rollingAvg;
  if (ratio >= 1.0) return 'Green';
  if (ratio >= 0.7) return 'Amber';
  return 'Red';
}
```

**Rolling averages:** Arithmetic mean of non-null values from prior 4 sprints. If all null for a metric, average is null.

**Program aggregation:** Weighted by `plannedPoints` per workstream: `SUM(metric × plannedPoints) / SUM(plannedPoints)`. Velocity is a simple SUM (not weighted average). Skip workstreams with null metric or 0 plannedPoints.

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (TDD: tests written first) — 59/59 pass ✅
- [x] 100% edge case coverage for null/zero/empty inputs ✅
- [x] RAG colors validated against seeded ThresholdConfig values ✅
- [x] TypeScript compiles without errors ✅
