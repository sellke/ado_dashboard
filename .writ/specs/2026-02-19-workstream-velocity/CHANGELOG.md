# Changelog — Phase 1C: Workstream Velocity Section

## 2026-02-23 — Amendment: Overhead Breakdown, Data Fixes, Precision

**Modification Contract:** Fix empty velocity rate and overhead % metric data; add per-workstream overhead breakdown chart (Meetings/Spikes/Bugs/Support) synced from ADO; fix carry-over % display precision to 2 decimal places.

### Changes Made

#### Stories Amended
- **Story 1 (API Extension)** — Added 6 tasks (1.8–1.13): investigate and fix null velocity rate and overhead % in API response; DB investigation for overhead work item type sync status
- **Story 2 (Types & Adapter)** — Added 5 tasks (2.11–2.15): carry-over % format fix to 2 decimal places; `OverheadBreakdownItem` type and `TrendSprintViewModel.overheadBreakdown` prerequisite types for Story 7
- **Story 3 (Velocity Trend Chart)** — Added 2 tasks (3.7–3.8): end-to-end verification that rolling average reference line and forecasted prediction render with real (non-null) data after Story 1 fix

#### Stories Added
- **Story 6 (Overhead Breakdown Sync & API)** — 8 tasks: DB investigation, ADO sync extension for Spikes/Support work item types, Meetings hours calculation (10.25h × active members from ADO Capacity), overhead breakdown API response extension
- **Story 7 (Overhead Breakdown Chart & Integration)** — 9 tasks: `OverheadBreakdownChart` component (Mantine LineChart, 4 series), adapter mapping, integration into WorkstreamHealthCard between velocity chart and bug list

#### Scope Change
- Overhead composition breakdown **moved from Phase 1D into Phase 1C** (this spec)
- Original spec excluded: "overhead composition breakdown (Phase 1D)" — now included

### Files Updated
- `spec.md` — amended contract summary, scope boundaries, added sections 7–9 (data fixes, carry-over precision, overhead breakdown spec), updated data flow and new code list
- `user-stories/README.md` — updated story table (7 total, 5 complete + 2 new), updated dependency graph, updated progress totals, updated key files table
- `user-stories/story-1-api-extension.md` — status updated, amendment section added (6 tasks)
- `user-stories/story-2-types-and-adapter.md` — status updated, amendment section added (5 tasks)
- `user-stories/story-3-velocity-trend-chart.md` — amendment section added (2 verification tasks)
- `user-stories/story-6-overhead-breakdown-sync-and-api.md` — **new file**
- `user-stories/story-7-overhead-breakdown-chart.md` — **new file**

### Backup Location
`backups/20260223-152025/`
