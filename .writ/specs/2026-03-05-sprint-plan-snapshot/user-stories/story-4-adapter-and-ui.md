# Story 4: Adapter and UI Updates

> **Status:** Complete
> **Priority:** Medium
> **Dependencies:** Story 3

## User Story

**As a** dashboard user
**I want to** see a clean sprint detail section without confusing carry-over item counts
**So that** the card shows only the meaningful metrics: planned points, completed points, carry-over points, and carry-over %

## Acceptance Criteria

- [ ] Given a workstream card's detail section, when rendered, then it does NOT show "X items" for carry-over — only "X pts"
- [ ] Given a completed sprint with 33 planned SP, 19 completed SP, and 14 carry-over SP, when the card renders, then the detail section shows "Planned: 33 · Completed: 19" and "Carry-over: 14 pts"
- [ ] Given the API response no longer includes `carryOverItems`, when the adapter maps the response, then the view model does not contain `carryOverItems`
- [ ] Given existing tests reference `carryOverItems`, when updated, then all tests pass with the field removed

## Implementation Tasks

- [ ] 4.1 Update `lib/dashboard/types.ts` — remove `carryOverItems` from `ApiWorkstream.detail` and `WorkstreamCardViewModel.detail` interfaces
- [ ] 4.2 Update `lib/dashboard/adapter.ts` — remove the `carryOverItems: formatDetailValue(d.carryOverItems)` line from `mapApiResponseToDashboardViewModel()`
- [ ] 4.3 Update `components/Dashboard/WorkstreamHealthCard.tsx` — change the carry-over line from `Carry-over: {detail.carryOverItems} items, {detail.carryOverPoints} pts` to `Carry-over: {detail.carryOverPoints} pts`
- [ ] 4.4 Update all test files that reference `carryOverItems` in detail objects — remove the field from fixtures, assertions, and snapshots
- [ ] 4.5 Run full test suite (`pnpm test`) and verify no regressions

## Notes

- The `carryOverItems` column remains in the `MetricSnapshot` database table for now — this story only removes it from the API response and UI. A future cleanup can drop the DB column.
- The carry-over % metric tile in the card header (separate from the detail section) is unchanged — it continues to display the `carryOverRate` from the metrics object.
- This is a non-breaking change from the user's perspective — they see fewer confusing numbers, not missing data.

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] No "items" reference in carry-over detail display
- [ ] Storybook renders correctly (if WorkstreamHealthCard has a story)
