# User Stories: Metric Definition Tooltips

> Spec: [spec.md](../spec.md) | Technical: [technical-spec.md](../sub-specs/technical-spec.md)

## Progress Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | [Metric definitions registry](story-1-metric-definitions-registry.md) | Complete | 7 | 7/7 |
| 2 | [Help UI components](story-2-help-ui-components.md) | Complete | 7 | 7/7 |
| 3 | [Dashboard integration](story-3-dashboard-integration.md) | Complete | 7 | 7/7 |
| 4 | [Tests and coverage](story-4-tests-and-coverage.md) | Complete | 7 | 7/7 |

**Total:** 4 stories · 28 tasks · 28 complete

## Dependency Graph

```
Story 1 (registry + adapter metricId)
    ↓
Story 2 (MetricDefinitionHint + RagBadge tooltips)
    ↓
Story 3 (ProgramSummarySection + WorkstreamHealthCard wiring)
    ↓
Story 4 (comprehensive tests + Storybook hardening)
```

## Story Overview

### Story 1 — Metric Definitions Registry
Centralize tooltip copy in `lib/metrics/definitions.ts` and attach `metricId` to all program/workstream metric tiles in the adapter. No UI changes.

### Story 2 — Help UI Components
Build `MetricDefinitionHint` (info icon + definition tooltip) and extend `RagBadge` with optional RAG explanation tooltips.

### Story 3 — Dashboard Integration
Wire hints on program tiles, workstream metric rows, and chart headers; pass RAG tooltips to badges on both program and workstream surfaces.

### Story 4 — Tests and Coverage
Lock registry copy, adapter mapping, component interaction paths, and Storybook variants for all six metric IDs.

## Quick Links

- [Issue source](../../issues/features/2026-05-18-metric-definition-tooltips.md)
- [Spec lite](../spec-lite.md)
