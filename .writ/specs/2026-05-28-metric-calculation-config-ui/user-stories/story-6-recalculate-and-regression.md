# Story 6 — Recalculate-now action + regression tests

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Story 2, Story 3

## User Story

As a **dashboard user**, I want **an explicit "Recalculate now" action after saving config,
plus confidence that defaults never drifted**, so that **I can apply changes immediately
and trust historical numbers stayed correct**.

## Acceptance Criteria

1. **Given** I saved a config change, **when** I click **Recalculate now**, **then**
   `POST /api/metrics/compute` runs and the dashboard reflects updated metrics on completion.
2. **Given** recompute is running, **when** I view the control, **then** progress/disabled
   state is shown; on error a toast appears and saved config is intact.
3. **Given** default config, **when** the full regression suite runs, **then** engine output
   equals the pre-feature fixture (no drift).
4. **Given** recompute is not triggered, **when** config changes are saved, **then** existing
   snapshots are unchanged until the next compute (forward-only confirmed).

## Implementation Tasks

- [ ] Add **Recalculate now** control to `MetricConfigPanel` wired to `POST /api/metrics/compute`
- [ ] Add loading/disabled + success/error notification states
- [ ] Author end-to-end regression test: seeded defaults → compute → assert equals fixture
- [ ] Add edge tests: recompute with no sprints (graceful 4xx), recompute during sync (newest config wins)
- [ ] Document the tooltip-drift follow-up (see notes) in spec + link to `2026-05-18-metric-definition-tooltips`

## Technical Notes

Reuses the existing `POST /api/metrics/compute` route — no new endpoint. The regression
fixture is the headline deliverable: it is the proof that the Story 2 refactor preserved
behavior under default config.

## Definition of Done

- [ ] Recalculate now works with proper UX states
- [ ] Regression equality test green under default config
- [ ] Forward-only behavior verified by test
- [ ] Tooltip-drift follow-up explicitly documented (not silently ignored)
- [ ] ≥80% coverage; regression path 100%

## Context for Agents

- **Follow-up dependency (out of scope, must document):** once thresholds/cutoffs are
  editable, the static copy in `2026-05-18-metric-definition-tooltips` shows stale numbers.
  Recommend a follow-up issue to source tooltip numbers from `loadMetricConfig`.
- Existing compute endpoint: `app/api/metrics/compute/route.ts`.
