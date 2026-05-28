# Metric definition and calculation tooltips

> **Type:** Feature
> **Priority:** Normal
> **Effort:** Medium
> **Created:** 2026-05-18
> **spec_ref:** .writ/specs/2026-05-18-metric-definition-tooltips/spec.md

## TL;DR

Add accessible tooltips (or equivalent hints) on dashboard metrics so readers see plain-language definitions and how each number is calculated.

## Current State

- Program-level metric tiles show label, value, and RAG badge with no explanation of meaning or formula (`ProgramSummarySection`).
- Workstream cards list core metrics (velocity, velocity rate, overhead %, carry-over %) without inline definitions.
- Chart sections (e.g. velocity, bug burndown) rely on axis/legend text only; calculation nuances stay in code or docs.
- Mantine `Tooltip` is already used in a few dashboard spots (sprints, story titles) but not for metric semantics.

## Expected Outcome

- Key metric labels (program tiles, workstream cards, and other high-traffic summary stats) expose a short **definition** plus a **calculation summary** where it reduces confusion (e.g. rolling window, included work item types, RAG basis).
- Content is consistent with how metrics are computed in `lib/metrics` / dashboard adapters (no contradictions with code).
- Interaction is keyboard- and screen-reader friendly (e.g. info affordance with `Tooltip` + `aria-describedby`, or `Popover` for longer text — follow existing Mantine patterns).

## Relevant Files

- `components/Dashboard/ProgramSummarySection.tsx` — program metric grid cards.
- `components/Dashboard/WorkstreamHealthCard.tsx` — per-workstream metric rows.
- `lib/dashboard/adapter.ts` — maps API/view models to displayed metrics (good place to attach tooltip copy or keys).

## Related Issues

- [2026-04-09-metric-calculation-config-ui](2026-04-09-metric-calculation-config-ui.md) — future UI for editing rules/thresholds; tooltips address “what does this mean?” in the shorter term and should stay aligned if that spec ships.

## Notes

- Prefer a single source of truth for tooltip strings (e.g. shared map keyed by metric id/label) so copy updates stay in sync with calculator changes.
