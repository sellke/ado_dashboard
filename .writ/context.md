# Project Context

> Auto-maintained by `/implement-spec` and `/implement-story`. Last updated: 2026-06-29.

## Active Spec

**2026-06-29-adp-metrics-dashboard-toggle** — Complete

Program-wide `includeAdpMetrics` toggle on `MetricEngineConfig`; Inclusion Rules UI; dashboard milestone fetch/panel gating; export slide/tile gating.

## Recent Changes

- Added `includeAdpMetrics Boolean @default(true)` to `MetricEngineConfig` (migration `20260629210927_add_include_adp_metrics`)
- Extended `PUT /api/metric-config/rules` with optional `includeAdpMetrics` in same transaction as rule upserts
- `MetricConfigPanel` Inclusion Rules tab: ADP checkbox + helper text; saves flag with rules
- `DashboardContainer`: loads metric config on mount; skips `/api/milestones` when excluded; passes `showAdpMetrics` to shell
- Export: `buildSlidePlan`, `buildProgramSummaryTiles`, `enrichExportInput` honor `includeAdpMetrics`

## Test Status

- 1473 tests passing (full suite)
- TypeScript: `tsc --noEmit` clean

## Next Steps

- Manual verify: toggle ADP off in Metric configuration → Save rules → reload → confirm panel hidden and export omits milestone content
- Optional: `/verify-spec`, `/ship`
