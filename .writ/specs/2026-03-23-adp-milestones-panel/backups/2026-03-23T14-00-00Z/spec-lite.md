# Spec Lite: ADP Milestones Panel — Program Summary

**Status:** Not Started | **Date:** 2026-03-23

## What's Being Built

Fix the "No milestone data available" message in the ADP Milestones panel (Program Summary section). The data exists — the component pipeline is broken in three places.

## Root Cause (3 breaks)

1. `ApiMilestoneWithProgress` type is missing `workstreamBreakdown` → silently dropped when container assigns API response to typed state
2. `groupMilestonesByQuarter()` (adapter.ts) is never called → no quarterly groups ever computed  
3. `DashboardShell` doesn't forward quarterly groups / loading / error to `ProgramSummarySection` → component gets empty defaults

## Key Constraints

- No API changes needed — `/api/milestones` already returns `workstreamBreakdown`
- No UI changes needed — `MilestoneQuarterlyPanel` display is correct
- No tag parser changes — `parseQuarterTag` already handles `Q# PLAN` format → returns "Q4"
- No regressions to workstream-level milestone goals (separate prop flow)

## Files in Scope

- `lib/milestones/types.ts` — add `workstreamBreakdown?: MilestoneWorkstreamBreakdown[]` to `ApiMilestoneWithProgress`
- `components/Dashboard/DashboardContainer.tsx` — compute `milestoneQuarterGroups`, pass to shell
- `components/Dashboard/DashboardShell.tsx` — forward groups + loading/error to `ProgramSummarySection`
- `__tests__/components/Dashboard/DashboardContainer.test.tsx` — wiring tests
- `__tests__/components/Dashboard/DashboardShell.test.tsx` — prop forwarding tests

## Success Criteria

- Panel shows real quarterly data when milestones with Q# tags are in DB
- Features grouped by `quarter` field (Q1→Q4, Untagged last)  
- Per-workstream progress bars accurate
- Loading/error states propagate
- All existing tests pass
