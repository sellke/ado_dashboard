# Writ Project Context

> Last Updated: 2026-06-12T21:35:00Z

## Product Mission

LiveLink Health Report automates weekly program health reporting for Medtronic's Unified LiveLink program by pulling data from Azure DevOps, calculating derived sprint/capacity metrics, and producing a live dashboard with PowerPoint slide export — replacing hours of manual report assembly with minutes of review.

## Active Spec

- **Spec:** 2026-06-05-five-sprint-window-visible-tabs — Visible Tabs Full Five-Sprint Window
- **Status:** Complete
- **Story:** 3 of 3 — Tests, regression parity, and sync-cost sanity (Complete)
- **Progress:** 15/15 implementation tasks completed
- **Validation:** Changed-file lints clean. `pnpm typecheck` passes. Focused Jest verification passes for `__tests__/lib/sync/iterations.test.ts`, `__tests__/app/api/sprints/stories/route.test.ts`, `__tests__/app/api/metrics/route.test.ts`, `__tests__/lib/metrics/trend-service.test.ts`, and the isolated new `sync-ado` orchestrator coverage test. Full `__tests__/api/sync-ado.test.ts` still has two existing real-sync success expectations that fail outside the isolated test.

## Open Issues

2 open issue file(s) under `.writ/issues/`.
