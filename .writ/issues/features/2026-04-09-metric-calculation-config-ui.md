# Metric Calculation Configuration UI

> **Type:** Feature
> **Priority:** Normal
> **Effort:** Large
> **Created:** 2026-04-09
> **spec_ref:** .writ/specs/2026-05-28-metric-calculation-config-ui/spec.md

## TL;DR

Add an in-app settings panel that lets users configure the calculations going into any metric: RAG thresholds, inclusion/exclusion rules (which work item types count toward which metrics), and velocity-RAG cutoffs — without touching code or environment variables.

## Current State

- RAG thresholds (`greenMin`, `greenMax`, `amberMin`, `amberMax`) are stored per metric in `ThresholdConfig` DB rows but there is no UI to view or edit them; changes require direct DB edits or migrations
- Inclusion/exclusion rules are hardcoded in calculator functions (e.g. `wi.type !== 'Bug' && wi.type !== 'Spike'` in `calculateVelocity`) — changing what counts toward a metric requires a code change and redeploy
- The velocity RAG cutoffs (Amber ≥ 0.7, Green ≥ 1.0 of rolling average) are hardcoded in `assignVelocityRag`
- Rolling average window (currently 4 sprints) is a magic number with no config surface
- Users have no visibility into how any metric is computed or what thresholds drive the RAG they see

## Expected Outcome

- A **Settings / Metric Configuration** panel in the dashboard exposes all configurable parameters in one place, organized by metric
- **RAG threshold editing** — per metric (velocity, overheadPercent, predictability, carryOverRate), set Green and Amber min/max; persisted to the `ThresholdConfig` table via API
- **Inclusion/exclusion rules** — checkboxes or toggles to control which work item types (`Bug`, `Spike`, `Support`, `Story`, `Task`) count toward each metric category (delivery points vs overhead hours); persisted to a new `MetricRuleConfig` table or similar
- **Velocity RAG cutoffs** — configurable Amber floor (default 0.70) and Green floor (default 1.0) as ratio of rolling average
- **Rolling window** — configurable sprint look-back window for rolling averages (default 4)
- Changes take effect on next metric computation (sync); optionally trigger a recalculation immediately
- Non-destructive: defaults match current hardcoded behavior so no metrics change on first deploy

## Relevant Files

- `lib/metrics/rag.ts` — `assignRag` and `assignVelocityRag`; cutoffs and ratio thresholds to make configurable
- `lib/metrics/calculators.ts` — `calculateVelocity`, `calculateOverhead`, `calculatePredictability`, `calculateCarryOver`; hardcoded type filters to replace with config-driven inclusion rules
- `lib/metrics/types.ts` — `ThresholdConfigInput` already models per-metric RAG config; needs extension for inclusion rules and velocity RAG cutoffs

## Related Issues

- [2026-04-09-exclude-bug-points-from-sprint-metrics](../improvements/2026-04-09-exclude-bug-points-from-sprint-metrics.md) - specific instance of an inclusion/exclusion rule; a configurable system would make this and similar rules UI-driven rather than code changes

## Notes

- **Scope risk:** This is a large feature with a DB schema change, API layer, and new UI panel. Consider phasing: (1) threshold editing UI first (lowest risk, `ThresholdConfig` table already exists), (2) inclusion rules second, (3) velocity RAG cutoffs and rolling window last.
- **Validation:** Threshold ranges need guardrails — e.g. greenMin ≤ greenMax, ranges shouldn't overlap in ways that produce undefined RAG behavior.
- **Permissions:** Consider whether all users or only admins should be able to edit metric config. No auth model currently exists in the dashboard.
- **Recalculation trigger:** Changing config mid-sprint could cause historical snapshots to drift from current settings; decide whether config changes are forward-only or retroactively recomputed.
