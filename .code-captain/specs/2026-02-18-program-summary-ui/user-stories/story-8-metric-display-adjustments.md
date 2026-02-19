# Story 8: Metric Display Adjustments (Predictability Removal + Carry-Over Rename)

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None (builds on completed Stories 1-7)
> **Phase:** 1B — Program Summary UI

## User Story

**As a** program stakeholder viewing the dashboard
**I want to** see only the most relevant program health metrics without predictability clutter
**So that** the dashboard focuses on actionable KPIs (velocity, overhead, carry-over) and makes room for upcoming milestone metrics

## Acceptance Criteria

- [x] Predictability metric tile is not rendered in the Program Summary section ✅
- [x] Predictability metric row/display is not rendered in any Workstream Health Card ✅
- [x] "Carry-Over Rate" label reads "Carry-Over %" in the Program Summary tile ✅
- [x] "Carry-Over Rate" label reads "Carry-Over %" in all Workstream Health Cards ✅
- [x] Backend MetricSnapshot still computes and stores predictability (no backend changes) ✅
- [x] All existing tests pass after modification (no regressions) ✅
- [x] Storybook stories reflect the updated tile layout and labels ✅

## Implementation Tasks

- [x] 8.1 Remove predictability from `METRIC_LABELS` in `lib/dashboard/adapter.ts`; rename carry-over label from "Carry-over rate" to "Carry-Over %" ✅
- [x] 8.2 Update `ProgramSummarySection.tsx` grid layout from 4-col to 3-col and update JSDoc ✅
- [x] 8.3 Update `WorkstreamHealthCard.tsx` JSDoc to reflect 3 core metrics ✅
- [x] 8.4 Update dashboard test fixtures in `__fixtures__/dashboard-fixtures.ts` to remove predictability fields; update component test assertions ✅
- [x] 8.5 Update Storybook stories for `ProgramSummarySection`, `WorkstreamHealthCard`, and `DashboardShell` to reflect removed predictability and renamed carry-over ✅
- [x] 8.6 Run full test suite and verify no regressions; 61 dashboard tests passing, 488/492 total (4 pre-existing failures unrelated to this story) ✅

## Notes

- The API response (`GET /api/metrics`) will still include predictability data — the adapter layer simply stops mapping it to view models
- The carry-over rename is cosmetic only: field names like `carryOverRate` and `carryOverRateAvg` stay the same in the API and database
- After this story, the Program Summary will temporarily show 3 tiles; Story 9 adds the 2 milestone placeholder tiles to reach the final 5-tile layout
- Predictability data remains available in the backend for potential future reintroduction if stakeholders request it

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (unit + component) ✅
- [x] Storybook stories updated ✅
- [x] Code reviewed ✅
- [x] Dashboard renders correctly at `/dashboard` ✅
