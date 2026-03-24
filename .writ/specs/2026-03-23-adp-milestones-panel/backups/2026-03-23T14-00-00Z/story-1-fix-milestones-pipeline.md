# Story 1: Fix ADP Milestones Panel Data Pipeline

**Status:** Completed ✅ (2026-03-23)  
**Priority:** High  
**Dependencies:** None  
**Spec:** `.writ/specs/2026-03-23-adp-milestones-panel/spec.md`

---

## User Story

**As a** program manager viewing the dashboard,  
**I want** the ADP Milestones panel under Program Summary to show real quarterly progress,  
**So that** I can see which Q# commitments are on track and which workstreams are driving progress.

---

## Acceptance Criteria

### Given milestones with Q# tags exist in the database
**When** the dashboard loads  
**Then** the ADP Milestones panel shows one card per quarter, each listing its Features with per-workstream progress bars

### Given a milestone feature has `workstreamBreakdown` data
**When** `groupMilestonesByQuarter` is called with the API response  
**Then** each `MilestoneFeatureViewModel` includes `workstreams` with accurate `completedPercent` and `inProgressPercent`

### Given the milestones API is loading
**When** the dashboard renders  
**Then** the ADP Milestones panel shows "Loading milestone data..." (not "No milestone data available")

### Given the milestones API returns an error
**When** the dashboard renders  
**Then** the ADP Milestones panel shows the error message in red

### Given all existing tests
**When** the fix is applied  
**Then** all existing tests continue to pass with no regressions

---

## Implementation Tasks

- [x] **1.1** Add `workstreamBreakdown?: MilestoneWorkstreamBreakdown[]` to `ApiMilestoneWithProgress` in `lib/milestones/types.ts`
- [x] **1.2** Write tests: `DashboardContainer` wires `milestoneQuarterGroups` prop from milestone response with breakdowns
- [x] **1.3** In `DashboardContainer`: derived `milestoneQuarterGroups` via `useMemo(() => groupMilestonesByQuarter(milestones), [milestones])`
- [x] **1.4** Pass `milestoneQuarterGroups` to `DashboardShell` (alongside existing `milestonesLoading` / `milestonesError`)
- [x] **1.5** Write tests: `DashboardShell` forwards `milestoneQuarterGroups`, `milestonesLoading`, `milestonesError` to `ProgramSummarySection`
- [x] **1.6** Add `milestoneQuarterGroups?: MilestoneQuarterGroup[]` to `DashboardShellProps` and forward all three milestone props to `ProgramSummarySection`
- [x] **1.7** Run full test suite and verify all existing tests pass

---

## Technical Notes

- `groupMilestonesByQuarter` is already in `lib/dashboard/adapter.ts` — no new logic needed, just call it
- The function accepts `Array<ApiMilestoneWithProgress & { workstreamBreakdown?: MilestoneWorkstreamBreakdown[] }>` — once the type is fixed (task 1.1), the intersection type can be simplified to just `ApiMilestoneWithProgress[]`
- `DashboardShell` already accepts `milestonesLoading` and `milestonesError` but only forwards them to `WorkstreamCardsGrid` — task 1.6 adds the `ProgramSummarySection` forwarding alongside
- Do NOT change `ProgramSummarySection` — its props interface already has `milestoneQuarterGroups`, `milestonesLoading`, and `milestonesError`; they're just not being passed in

---

## Definition of Done

- [x] `ApiMilestoneWithProgress` includes `workstreamBreakdown` field
- [x] `DashboardContainer` computes and passes `milestoneQuarterGroups` to `DashboardShell`
- [x] `DashboardShell` forwards all three milestone props to `ProgramSummarySection`
- [x] Loading and error states propagate correctly
- [x] All tests pass (no regressions)
- [x] TypeScript compilation clean (`tsc --noEmit`)

---

## What Was Built

**Implemented:** 2026-03-23

**Files modified:** 5 (3 source, 2 test)
- `lib/milestones/types.ts` — added `workstreamBreakdown?: MilestoneWorkstreamBreakdown[]` to `ApiMilestoneWithProgress`
- `components/Dashboard/DashboardContainer.tsx` — added `useMemo`-derived `milestoneQuarterGroups`, passed to `DashboardShell`
- `components/Dashboard/DashboardShell.tsx` — added `milestoneQuarterGroups?` to props, forwarded all three milestone props to `ProgramSummarySection`
- `__tests__/components/Dashboard/DashboardContainer.test.tsx` — 3 new tests (quarterly panel, loading, error)
- `__tests__/components/Dashboard/DashboardShell.test.tsx` — 3 new tests (prop forwarding)

**Key decisions:**
- Used `useMemo` for `milestoneQuarterGroups` (derived from `milestones` state) rather than separate state — keeps them in sync automatically across all fetch paths, per arch-check recommendation
- BOUNDARY_DEVIATION on `lib/dashboard/adapter.ts`: simplified `groupMilestonesByQuarter` intersection type to `ApiMilestoneWithProgress[]` — the intersection became dead code after the type fix; anticipated and endorsed in Technical Notes

**Test results:** 1029/1029 tests passed, 72/72 suites, zero regressions. TypeScript clean.
