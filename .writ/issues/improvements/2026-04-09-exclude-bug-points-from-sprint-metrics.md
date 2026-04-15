# Exclude Bug Points from Sprint Point Plans, Forecasts, and Reports

> **Type:** Improvement
> **Priority:** High
> **Effort:** Medium
> **Created:** 2026-04-09
> **spec_ref:** _(set automatically when promoted via `/create-spec --from-issue`)_

## TL;DR

Bug story points must be excluded from all sprint point-based metrics (velocity, predictability, carry-over, planned/completed points); Bug *hours* are already correctly counted as Overhead and should remain so.

## Current State

- `calculateVelocity` sums `storyPoints` for all done-state items regardless of type — including `Bug`
- `calculatePredictability` and `calculateCarryOver` both compute `plannedPoints` by summing `storyPoints` across all work item types, including `Bug`
- `plannedPoints`, `completedPoints`, and `carryOverPoints` surfaced in the dashboard adapter therefore include Bug SP, inflating or distorting sprint point plans and forecasts
- Bug *hours* (`completedWork ?? originalEstimate`) are already correctly captured in `calculateOverhead` as `bugHours` — this is correct and must not change

## Expected Outcome

- All point-based sprint metrics (velocity, predictability, carry-over rate, planned points, completed points, carry-over points) exclude items where `type === 'Bug'`
- Bug story points do **not** appear in sprint point plans or forecasts
- Bug *hours* continue to flow into Overhead metrics unchanged
- Displayed point totals, velocity averages, and carry-over rates reflect delivery work only (Stories, Tasks, Spikes where applicable)

## Relevant Files

- `lib/metrics/calculators.ts` — `calculateVelocity`, `calculatePredictability`, `calculateCarryOver` all need a `type !== 'Bug'` filter on storyPoints aggregation
- `lib/dashboard/adapter.ts` — `plannedPoints`, `completedPoints`, `carryOverPoints` flow through here; verify the filter is applied upstream before these values are formatted
- `lib/metrics/trend-service.ts` — velocity and carry-over are aggregated per sprint here; ensure filtered values are passed through correctly

## Related Issues

- [2026-04-08-remove-overhead-bar-chart-workstream-cards](../improvements/2026-04-08-remove-overhead-bar-chart-workstream-cards.md) - related Overhead metrics surface cleanup

## Notes

- `Spike` types currently contribute `storyPoints × 1.0` to overhead *hours* (treated as 1 SP = 1 hr) — their story points may also warrant exclusion from sprint point plans; clarify scope before implementing
- Downstream tests in `__tests__/lib/metrics/` will need fixture updates to add `type` fields and assert Bug points are excluded
