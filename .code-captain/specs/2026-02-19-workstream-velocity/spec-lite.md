# Phase 1C: Workstream Velocity Section — AI Context Summary

> Spec: .code-captain/specs/2026-02-19-workstream-velocity/spec.md
> Prior work: Phase 1B complete (Program Summary UI), stories 1-10

## What This Phase Delivers

Extends WorkstreamHealthCards with visual velocity trends, per-workstream prediction, velocity rate metric, and per-sprint bug listings.

## Key Changes

**Velocity Rate Tile (4th metric):**
- Add velocity rate (pts/hr) as 4th metric tile in each workstream card
- Order: Velocity, Velocity Rate, Overhead %, Carry-Over %
- No RAG for velocity rate (informational only)

**Velocity Line Chart:**
- Replace text-based trend section with Mantine LineChart (~200px)
- 4 completed sprints (solid line + dots) + current sprint prediction (dashed extension)
- Horizontal reference line for rolling average labeled "Avg: X"
- Matches program-level chart styling

**Per-Workstream Prediction:**
- Formula: avgVelocityRate × currentSprintNetCapacityHours
- `buildTrendSeries()` already computes this — just needs API exposure
- Displayed as dashed extension with "(Forecasted)" label

**Per-Sprint Bug Listing:**
- Individual bugs listed per sprint: ADO ID (#12345), title, state
- Closed bugs rendered with strikethrough
- New API query: WorkItem type=Bug per sprint per workstream
- Grouped by sprint, below velocity chart

## API Changes

Extend `GET /api/metrics` workstream response:
- Add `prediction: { velocity, velocityRate, mode, formula }` per workstream
- Add `bugs: Array<{adoId, title, state}>` to each trend sprint object

## Key Files to Modify

- `app/api/metrics/route.ts` — per-workstream prediction + per-sprint bug query
- `lib/dashboard/types.ts` — extended API types, TrendBugViewModel
- `lib/dashboard/adapter.ts` — velocity rate tile mapping, bug mapping, prediction mapping
- `components/Dashboard/WorkstreamHealthCard.tsx` — 4 tiles, chart, bug list integration

## New Files

- `components/Dashboard/VelocityTrendChart.tsx` — inline velocity line chart
- `components/Dashboard/SprintBugList.tsx` — per-sprint bug listing with strikethrough

## Constraints

- 5-sprint rolling window (current + 4 prior), matching existing window
- No Storybook stories (deferred)
- No carry-over chart (metric tile only)
- No overhead composition (Phase 1D)
- Bug listing shows ADO ID + title + state only (hours in Phase 1D)
