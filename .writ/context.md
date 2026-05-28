# Context

## Active specification

- **2026-05-18-metric-definition-tooltips** — completed 2026-05-28: Accessible definition/calculation tooltips on dashboard metric tiles, chart headers, and RAG badges. Single source of truth for copy keyed by stable `MetricId`, hybrid interaction (info icon on labels/headers, tooltip on RAG badges), aligned with `lib/metrics` calculators and seeded `ThresholdConfig` defaults. All 4 stories complete (28/28 tasks).

## Recent changes

- Registry: `lib/metrics/definitions.ts` exports `MetricId`, `METRIC_DEFINITIONS`, `getMetricTooltip()` (multiline `Definition:`/`Calculation:` body), and `getRagTooltip()` (RAG threshold copy for velocity/overhead/carry-over, null otherwise). Static copy describing current hardcoded behavior.
- View model + adapter: `MetricTileViewModel.metricId?` added; `lib/dashboard/adapter.ts` attaches IDs to all four program tiles and all four workstream rows (incl. velocity override and spliced Velocity Rate row).
- Components: new `components/Dashboard/MetricDefinitionHint.tsx` (subtle `ActionIcon` + `IconInfoCircle` + Mantine `Tooltip`, focus/hover events, null render for unknown IDs); `RagBadge` extended with optional `ragTooltip` (focusable, aria-labelled, tooltip-wrapped only when provided).
- Integration: `ProgramSummarySection` and `WorkstreamHealthCard` wire hints beside tile/row labels and `Velocity (Points)` / `Bug Burndown` chart headers, and pass `getRagTooltip(metricId)` to badges.
- Verification: registry test at 100% coverage incl. seeded-threshold drift guard; new component + adapter + integration tests pass; `tsc --noEmit` clean. Full suite 1217/1218 (single failure is a pre-existing `DashboardIntegration` "server error" test, broken by the workstream-config spec's new `/api/workstreams` fetch — unrelated to this spec).

## Previous specification

- **2026-05-27-dashboard-workstream-config-ui** — completed 2026-05-27: Dashboard workstream scope modal, browser-local dashboard-scoped persistence, all-workstreams API, scoped metrics/milestones requests, scoped sprint-story fetches, and export consistency.
