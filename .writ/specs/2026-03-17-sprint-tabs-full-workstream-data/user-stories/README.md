# User Stories Overview

> **Specification:** Sprint Tabs — Full Workstream Data Scoping
> **Created:** 2026-03-17
> **Status:** Complete

## Stories Summary

| Story | Title | Status | Tasks | Progress |
| ----- | ----- | ------ | ----- | -------- |
| 1 | Enrich API Trend Sprints with MetricSnapshot Data | Complete ✅ | 5 | 5/5 |
| 2 | Extend Types and Adapter for Enriched Trend Data | Complete ✅ | 5 | 5/5 |
| 3 | Metrics Row Responds to Active Sprint | Complete ✅ | 6 | 6/6 |
| 4 | Detail Block Responds to Active Sprint | Complete ✅ | 6 | 6/6 |
| 5 | Velocity Chart Highlights Selected Sprint | Complete ✅ | 5 | 5/5 |

**Total Progress:** 27/27 tasks (100%)

## Story Dependencies

```
Story 1 (API enrichment)
  └─→ Story 2 (Types + Adapter)
        ├─→ Story 3 (Metrics row scoping)
        └─→ Story 4 (Detail block scoping)

Story 5 (Velocity chart highlight) — independent, can run in parallel
```

- Story 1 must complete first — it provides the enriched API data
- Story 2 depends on Story 1 — it types and maps the new fields
- Stories 3 and 4 depend on Story 2 — they consume the enriched view models
- Stories 3 and 4 can run in parallel (both modify WorkstreamHealthCard, but different sections)
- Story 5 is independent — only adds a prop and visual highlight to VelocityTrendChart

## Quick Links

- [Story 1: Enrich API Trend Sprints](./story-1-api-trend-enrichment.md) ✅
- [Story 2: Extend Types and Adapter](./story-2-types-and-adapter.md) ✅
- [Story 3: Metrics Row Responds to Active Sprint](./story-3-metrics-row-scoping.md) ✅
- [Story 4: Detail Block Responds to Active Sprint](./story-4-detail-block-scoping.md) ✅
- [Story 5: Velocity Chart Highlights Selected Sprint](./story-5-velocity-chart-highlight.md) ✅
