# Spec Lite: ADP Milestones Panel — Program Summary

**Status:** Not Started | **Date:** 2026-03-23

## What's Being Built

Fix the "No milestone data available" message in the ADP Milestones panel (Program Summary section). The data exists — the component pipeline is broken in three places.

## Root Cause (3 breaks)

1. `ApiMilestoneWithProgress` type is missing `workstreamBreakdown` → silently dropped when container assigns API response to typed state
2. `groupMilestonesByQuarter()` (adapter.ts) is never called → no quarterly groups ever computed  
3. `DashboardShell` doesn't forward quarterly groups / loading / error to `ProgramSummarySection` → component gets empty defaults

## Key Constraints

- No UI changes needed — `MilestoneQuarterlyPanel` display is correct
- No tag parser changes — `parseQuarterTag` already handles `Q# PLAN` format → returns "Q4"; `parseAdpTag` regex defines the ADP-MON format
- No regressions to workstream-level milestone goals (separate prop flow)
- No sync changes — child stories for all Feature children are still fetched; ADP-MON filter is applied at read time in the API route
- `/api/milestones` route **is** changed: filter child stories to ADP-MON-tagged only before progress/breakdown

## Files in Scope

- `lib/milestones/types.ts` — add `workstreamBreakdown?: MilestoneWorkstreamBreakdown[]` to `ApiMilestoneWithProgress`
- `components/Dashboard/DashboardContainer.tsx` — compute `milestoneQuarterGroups`, pass to shell
- `components/Dashboard/DashboardShell.tsx` — forward groups + loading/error to `ProgramSummarySection`
- `__tests__/components/Dashboard/DashboardContainer.test.tsx` — wiring tests
- `__tests__/components/Dashboard/DashboardShell.test.tsx` — prop forwarding tests
- `lib/milestones/format.ts` — add `hasAdpMonTag(tags: string | null): boolean`
- `app/api/milestones/route.ts` — filter child stories by ADP-MON tag
- `__tests__/app/api/milestones/route.test.ts` — ADP-MON filter tests

## Success Criteria

- Panel shows real quarterly data when milestones with Q# tags are in DB
- Features grouped by `quarter` field (Q1→Q4, Untagged last)
- Per-workstream progress bars count **only ADP-MON-tagged stories**
- Stories without `ADP-MON` tags are excluded from all milestone calculations
- Loading/error states propagate
- All existing tests pass
