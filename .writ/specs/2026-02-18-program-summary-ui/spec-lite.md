# Phase 1B: Program Summary UI — AI Context Summary

> Spec: .writ/specs/2026-02-18-program-summary-ui/spec.md
> Prior work: 2026-02-12-program-dashboard-ui (stories 1-7, 38/38 tasks, DONE)

## What This Phase Delivers

Phase 1B completes the Program Summary UI. Stories 1-7 built the dashboard shell, metric tiles, workstream cards, trends, sync, and Storybook. Stories 8-10 finish it.

## New Work (Stories 8-10)

**Story 8 — Metric Display Adjustments:**
- Remove predictability metric from ProgramSummarySection, WorkstreamHealthCard, adapter, types, tests, Storybook
- Rename "Carry-Over Rate" → "Carry-Over %" (display only, field names unchanged)
- Backend still computes/stores predictability; only UI consumption is removed

**Story 9 — Milestone Tile Data Contract + Placeholder UI:**
- Add `milestoneMonthly` and `milestoneQuarterly` to `ApiResponse.program.metrics` as `{ value: number | null, rag: RagStatus | null }`
- Add `MilestoneMetricTile` component (or extend existing tile) with empty state: "—" + "No milestone data yet"
- Seed `ThresholdConfig` rows: `milestoneMonthly` (Green ≥80%, Amber 60-79%, Red <60%), `milestoneQuarterly` (same)
- 5-tile program summary layout: Velocity, Overhead%, Carry-Over %, Monthly Milestone %, Quarterly Milestone Progress
- Phase 1E will fill in real values

**Story 10 — End-to-End Validation:**
- Manual spot check: compare dashboard values to ADO for most recent completed sprint
- Automated tests: assert metric values against known expected outputs
- Output: validation-report.md in this spec folder

## Tile Layout

| # | Tile | Source |
|---|------|--------|
| 1 | Average Velocity | MetricSnapshot program-level |
| 2 | Overhead % | MetricSnapshot program-level |
| 3 | Carry-Over % | MetricSnapshot program-level |
| 4 | Monthly Milestone % | null (Phase 1E) |
| 5 | Quarterly Milestone Progress | null (Phase 1E) |

## Key Files to Modify

- `components/Dashboard/ProgramSummarySection.tsx` — tile layout, predictability removal, milestone tiles
- `components/Dashboard/WorkstreamHealthCard.tsx` — predictability removal, carry-over rename
- `lib/dashboard/types.ts` — remove predictability from view models, add milestone types
- `lib/dashboard/adapter.ts` — remove predictability mapping, add milestone mapping
- `prisma/seed.ts` — add milestone RAG thresholds
- `app/api/metrics/route.ts` — extend response with milestone fields (null for now)

## Constraints

- Milestone tiles must accept `null` values cleanly — Phase 1E fills them in
- Predictability removed from UI only, not backend
- Carry-over rename is display-only
- Validation covers most recent completed sprint
