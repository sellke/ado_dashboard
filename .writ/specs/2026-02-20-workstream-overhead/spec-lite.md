# Phase 1D: Workstream Overhead Section — Spec Lite

> For AI context windows. Full spec: `spec.md`

## What We're Building

Add `OverheadBreakdownPanel` to each `WorkstreamHealthCard`:
1. **Stacked bar chart** — ceremony/bug/spike/support hours per sprint (rolling window)
2. **Bug item table** — ADO ID, title, hours, state for current sprint's bugs
3. **Support item table** — same for support items

## Calculation Rules

| Type | Hours Source |
|---|---|
| Ceremony | `SprintWorkstream.ceremonyHours` (10.25 × FTE) |
| Bug | `completedWork ?? originalEstimate ?? 0` |
| Support | `completedWork ?? originalEstimate ?? 0` |
| Spike | `storyPoints × 1` (chart only, no listing) |

## Schema Change

Add to `MetricSnapshot`: `ceremonyHours Float?`, `bugHours Float?`, `spikeHours Float?`, `supportHours Float?`

## Key Files

- `prisma/schema.prisma` + new migration
- `lib/metrics/types.ts` — extend `OverheadResult`
- `lib/metrics/calculators.ts` — return breakdown from `calculateOverhead()`
- `lib/metrics/orchestrator.ts` — persist breakdown
- `app/api/metrics/route.ts` — add `overheadComposition` to trend sprints, `currentSprintOverheadItems` to workstreams
- `lib/dashboard/types.ts` — `ApiOverheadComposition`, `ApiOverheadItem`, `OverheadCompositionViewModel`, `OverheadItemViewModel`
- `lib/dashboard/adapter.ts` — map new fields
- `components/Dashboard/OverheadCompositionChart.tsx` — new (Mantine `BarChart` stacked)
- `components/Dashboard/CurrentSprintItemTables.tsx` — new (bug + support lists with hours)
- `components/Dashboard/OverheadBreakdownPanel.tsx` — new umbrella
- `components/Dashboard/WorkstreamHealthCard.tsx` — integrate panel

## Story Order

Story 1 (schema + calculator) → Story 2 (API) → Story 3 (types + adapter) → Story 4 (chart) + Story 5 (item tables) [parallel] → Story 6 (panel + card integration)

## Out of Scope

- Spike item listing (hours in chart only)
- Sprint selector (current sprint only)
- Item pagination
