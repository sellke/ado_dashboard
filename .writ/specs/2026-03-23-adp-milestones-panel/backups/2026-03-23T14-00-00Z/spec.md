# Spec: ADP Milestones Panel — Program Summary

**Status:** Not Started  
**Created:** 2026-03-23  
**Spec folder:** `.writ/specs/2026-03-23-adp-milestones-panel/`

---

## Contract Summary

**Deliverable:** Fix the broken ADP Milestones panel in the Program Summary section so it displays real quarterly milestone progress grouped by Q# tag, with per-workstream aggregate progress bars.

**Must Include:** Quarterly grouping of ADO Features by their `Q# PLAN` tag, showing per-workstream story completion aggregates for each Feature.

**Hardest Constraint:** The data already exists at every layer — the fix is purely wiring. No new data model or API changes are required; the three-layer pipeline break must be repaired without regressions to the workstream section's milestone display.

---

## Root Cause Analysis

The panel currently reads "No milestone data available" due to three compounding breaks in the component pipeline:

### Break 1 — Type gap in `ApiMilestoneWithProgress`

`lib/milestones/types.ts` defines `ApiMilestoneWithProgress` without a `workstreamBreakdown` field. The `/api/milestones` GET handler computes and returns `workstreamBreakdown` per milestone, but TypeScript's structural typing silently discards it when `DashboardContainer` assigns the response to `ApiMilestoneWithProgress[]`. By the time `groupMilestonesByQuarter` could run, the breakdown data is gone.

### Break 2 — `groupMilestonesByQuarter` is never called

`lib/dashboard/adapter.ts` exports `groupMilestonesByQuarter()`, which takes the milestone array and groups them by `quarter` field into `MilestoneQuarterGroup[]`. Nobody calls it. `DashboardContainer` stores milestones in state and passes them only to `mapApiResponseToDashboardViewModel` (which uses them for workstream-level milestone goals — a separate concern), never computing the quarterly groups needed by `ProgramSummarySection`.

### Break 3 — `DashboardShell` doesn't forward quarterly groups (or loading/error state) to `ProgramSummarySection`

`DashboardShell` receives `milestonesLoading` and `milestonesError` but forwards them only to `WorkstreamCardsGrid`. `ProgramSummarySection` is called with no `milestoneQuarterGroups`, `milestonesLoading`, or `milestonesError` props — it falls back to the empty-array default, triggering the "No milestone data available" message.

---

## Tagging Model

Understanding the tag structure is important for correct grouping:

| Work Item Type | Tags Present | Grouping Key |
|---|---|---|
| Feature | `Q# PLAN` (e.g., `Q4 PLAN`) | `quarter` → "Q4" |
| User Story | `ADP-MON` (e.g., `ADP-MAR`) + `Q# PLAN` | Rolls up to parent Feature's quarter |

The existing `parseQuarterTag()` already handles `Q# PLAN` format — it matches `Q[1-4]` followed by optional whitespace/suffix, so "Q4 PLAN" correctly returns "Q4". No tag parser changes are needed.

Milestones are created from **Features** with Q# tags during sync. The `milestone.quarter` column stores the parsed quarter string (e.g., "Q4"). Child User Stories are synced separately and their workstream breakdown is computed in the API handler. The grouping in the panel reflects Feature-level quarterly buckets with story progress aggregated per workstream.

---

## Experience Design

### Entry point
User lands on the dashboard; the "Program Summary" section is the first content area below the header metrics tiles.

### Happy path
1. Page loads → milestones API called in parallel with metrics API
2. "ADP Milestones" sub-heading appears below the metrics tiles
3. Panel shows one card per quarter (e.g., "Q4", "Q3"), ordered `Q1` → `Q4` with `Untagged` last
4. Each quarter card lists its Features; each Feature shows per-workstream progress bars (existing `MilestoneQuarterlyPanel` UI — no visual changes required)
5. Progress bars reflect real story-level completion data from ADO

### Empty/loading states
- While milestones are loading: "Loading milestone data..." (already handled by `MilestoneQuarterlyPanel`)
- If milestones error: error text in red (already handled)
- If no milestones exist in DB: "No milestone data available" (correct — DB is genuinely empty)
- If milestones exist but all have empty `workstreamBreakdown` (features with no child stories): "No milestone data available" — acceptable behavior, `groupMilestonesByQuarter` skips features with no breakdown

### Feedback model
No user-triggered actions; display-only panel. Data refreshes on sync.

---

## Business Rules

- Grouping is by Feature's `Q#` tag (e.g., "Q4"), not by `ADP-MON` month tag
- Features without any Q# or ADP tag are not synced as milestones and will not appear
- Features with a Q# tag but no child stories show no breakdown rows and are excluded from the panel (this is intentional — no progress to display)
- The quarterly panel in Program Summary shows program-wide aggregates across all workstreams — workstream-specific detail is handled in the Workstream Cards section (future spec)
- Loading and error states for milestones are independent of the metrics API loading state

---

## Success Criteria

1. The ADP Milestones panel in Program Summary displays real data when milestones with Q# tags exist in the database
2. Features are grouped by their `quarter` field (Q# extracted from `Q# PLAN` tag)
3. Per-workstream progress bars show accurate story completion percentages
4. Loading and error states propagate correctly to the panel
5. No regressions to the workstream-level milestone display (milestone goals in workstream cards are unaffected)
6. All existing tests pass; new tests cover the wiring

---

## Scope Boundaries

**Included:**
- `ApiMilestoneWithProgress` type extended to include `workstreamBreakdown`
- `DashboardContainer` computes `milestoneQuarterGroups` and passes to `DashboardShell`
- `DashboardShell` forwards `milestoneQuarterGroups`, `milestonesLoading`, `milestonesError` to `ProgramSummarySection`

**Excluded:**
- No changes to `/api/milestones` route logic (it already returns the right data)
- No changes to `MilestoneQuarterlyPanel` UI (display is correct once wired)
- No changes to `parseQuarterTag` or `parseAdpTag` (tag parsing is correct)
- No story-level detail in the panel (deferred to workstream section spec)
- No new API endpoints or DB schema changes

---

## Files in Scope

| File | Change Type |
|---|---|
| `lib/milestones/types.ts` | Add `workstreamBreakdown` to `ApiMilestoneWithProgress` |
| `components/Dashboard/DashboardContainer.tsx` | Compute `milestoneQuarterGroups`, pass to `DashboardShell` |
| `components/Dashboard/DashboardShell.tsx` | Accept and forward quarterly groups + loading/error to `ProgramSummarySection` |
| `__tests__/components/Dashboard/DashboardContainer.test.tsx` | Update / add tests for quarterly group wiring |
| `__tests__/components/Dashboard/DashboardShell.test.tsx` | Update / add tests for prop forwarding |
| `__tests__/lib/dashboard/adapter.test.ts` | Verify `groupMilestonesByQuarter` with `workstreamBreakdown` data |
