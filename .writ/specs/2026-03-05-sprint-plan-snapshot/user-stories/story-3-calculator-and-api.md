# Story 3: Carry-Over Calculator and API Route Updates

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1, Story 2

## User Story

**As a** dashboard viewer
**I want to** see accurate carry-over percentages on completed sprint detail sections
**So that** the metrics reflect the true planned vs completed story points, including items that were moved to the next sprint

## Acceptance Criteria

- [ ] Given a completed sprint with snapshot data showing 33 planned SP and 19 completed SP, when the API returns detail for that sprint, then carry-over % = (33-19)/33 × 100 = 42.42%
- [ ] Given a completed sprint with snapshot data, when the API returns detail, then `plannedPoints` reflects the snapshot total (not just items still assigned to the sprint)
- [ ] Given a completed sprint, when the API returns detail, then `carryOverItems` is not present in the response
- [ ] Given a current (in-progress) sprint, when carry-over is calculated, then the existing live-WorkItem-based calculation is used (unchanged)
- [ ] Given a completed sprint with no snapshot data (pre-feature sprints), when the API returns detail, then it falls back to existing MetricSnapshot values

## Implementation Tasks

- [ ] 3.1 Write tests for: (a) `calculateCarryOver` with snapshot input produces correct rate, (b) API route uses snapshot data for completed sprint detail, (c) fallback when no snapshot exists, (d) `carryOverItems` is absent from response
- [ ] 3.2 Update `calculateCarryOver()` in `lib/metrics/calculators.ts` — no signature change needed; the caller (`computeWorkstreamMetrics`) passes in the right data source. For completed sprints, the snapshot module queries `SprintPlanSnapshot` and maps rows to `WorkItemInput[]` before calling the calculator.
- [ ] 3.3 In `lib/metrics/snapshot.ts`, when computing a completed sprint, query `SprintPlanSnapshot` for that sprint+workstream and map rows to `WorkItemInput[]` to pass to `calculateCarryOver()` instead of live `WorkItem` rows
- [ ] 3.4 Update `app/api/metrics/route.ts` — in the prior-sprint detail path: query `SprintPlanSnapshot` for the prior sprint to compute accurate `plannedPoints`, `completedPoints`, `carryOverPoints`, and `carryOverRate`; remove `carryOverItems` from the detail object
- [ ] 3.5 Update the `priorDetailMap` type and query to use snapshot-based values; remove the bug-fix carry-over-rate override (it's now handled by accurate snapshot data)
- [ ] 3.6 Verify end-to-end: API returns correct carry-over % for completed sprints using snapshot data

## Notes

- The `calculateCarryOver()` function itself doesn't change — it already accepts `WorkItemInput[]` and returns the correct result. The change is in *what data* gets passed to it.
- For completed sprints without snapshots (historical data before this feature), fall back to existing `MetricSnapshot` values. This ensures backward compatibility.
- The carry-over rate in `MetricSnapshot` for completed sprints will now reflect snapshot-based calculations, making it accurate.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] API returns accurate carry-over % verified against known sprint data
- [ ] Backward compatible with sprints that have no snapshot data
