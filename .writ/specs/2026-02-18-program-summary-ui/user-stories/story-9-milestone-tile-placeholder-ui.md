# Story 9: Milestone Tile Data Contract and Placeholder UI

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 8 (clean 3-tile layout to build on)
> **Phase:** 1B — Program Summary UI

## User Story

**As a** program stakeholder viewing the dashboard
**I want to** see placeholder tiles for Monthly Milestone Completion % and Quarterly Milestone Progress in the Program Summary
**So that** the dashboard layout is complete and ready to display real milestone data when Phase 1E provides it

## Acceptance Criteria

- [x] Program Summary displays 5 metric tiles: Velocity, Overhead%, Carry-Over %, Monthly Milestone %, Quarterly Milestone Progress ✅
- [x] Milestone tiles show "—" as the value when no data is available ✅
- [x] Milestone tiles show "No milestone data yet" as subtext in the empty state ✅
- [x] Milestone tiles show a neutral/gray indicator (not Green/Amber/Red) when data is null ✅
- [x] When milestone data is provided (number value), tiles display the percentage with proper RAG color coding ✅
- [x] ThresholdConfig seed includes `milestoneMonthly` and `milestoneQuarterly` with Green ≥80%, Amber 60-79%, Red <60% ✅
- [x] API response type includes milestone metric fields (null for now) ✅
- [x] Storybook shows both empty-state and data-populated milestone tile variants ✅

## Implementation Tasks

- [x] 9.1 Add milestone metric types to `lib/dashboard/types.ts`: extend `DashboardViewModel` program metrics with `milestoneMonthly: { value: number | null, rag: RagStatus | null }` and `milestoneQuarterly: { value: number | null, rag: RagStatus | null }` ✅
- [x] 9.2 Extend `app/api/metrics/route.ts` response to include `milestoneMonthly: null` and `milestoneQuarterly: null` in the program metrics block; update `lib/dashboard/adapter.ts` to map these null-safe fields ✅
- [x] 9.3 Add `milestoneMonthly` and `milestoneQuarterly` ThresholdConfig rows to `prisma/seed.ts` with thresholds: greenMin=80, greenMax=100, amberMin=60, amberMax=79.99, redMin=0, redMax=59.99 ✅
- [x] 9.4 Update `ProgramSummarySection.tsx` to render 5 tiles in the grid; milestone tiles use the same tile component pattern but handle null values with "—" display and "No milestone data yet" subtext, plus a neutral/gray RAG indicator ✅
- [x] 9.5 Update test fixtures and component tests: add milestone fields to fixtures, test empty-state rendering, test populated-state rendering with RAG ✅
- [x] 9.6 Add Storybook stories for milestone tile variants: empty state (null data), populated state (75% amber, 90% green, 45% red) ✅

## Notes

- The milestone tiles intentionally use the same visual pattern as existing metric tiles (consistent UX) but handle null data gracefully
- Phase 1E will provide real values by extending the metrics API response — no changes to tile components will be needed
- The neutral/gray indicator for null state prevents misleading RAG signals before data exists
- Threshold values (80/60) are initial defaults; operator can adjust via ThresholdConfig
- The Prisma seed migration should be idempotent (upsert, not insert) to avoid conflicts with existing threshold data

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (unit + component + seed) ✅
- [x] Storybook stories cover empty and populated variants ✅
- [x] Code reviewed ✅
- [x] Dashboard renders 5-tile layout at `/dashboard` ✅
- [x] Prisma seed runs without errors ✅
