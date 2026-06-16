# Component Inventory

> **Visual Reference Mode:** Match existing app patterns

## Existing Components to Reuse or Extend

| Component | Role in This Spec |
|---|---|
| `ProgramSummarySection` | Add program-level cycle-time summary or host a focused cycle-time child component |
| `WorkstreamHealthCard` | Add per-workstream cycle-time breakdown |
| `RagBadge` | Reuse only if cycle time later gets health thresholds; not required in v1 |
| `DashboardContainer` | Continue owning fetch lifecycle; no new independent data fetch for cycle time |
| `DashboardShell` | Preserve loading, error, empty, and success state routing |
| `lib/dashboard/adapter.ts` | Map raw API cycle-time data into formatted view model fields |

## New Component Candidates

| Candidate | Purpose | Owning Story |
|---|---|---|
| `CycleTimeSummary` | Shared display for by-type total/average/unavailable counts | Story 4 |
| `CycleTimeTypeRow` | Compact row for one type: User Story, Spike, or Bug | Story 4 |

## States

| State | Expected UI |
|---|---|
| Populated | Show total business days, average business days, completed count, unavailable count |
| Empty | Show `N/A` average and no misleading zero duration |
| Partial data | Show available metrics plus unavailable count |
| Error | Use existing dashboard error state |
| Loading | Use existing dashboard loading skeleton/state |
