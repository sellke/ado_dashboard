# User Stories Overview

> **Specification:** Metric Calculation Engine
> **Created:** 2026-02-11
> **Status:** Completed ✅

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | MetricSnapshot Schema, Types & Migration | Completed ✅ | 7 | 7/7 |
| 2 | Metric Calculators & Enrichment | Completed ✅ | 8 | 8/8 |
| 3 | Orchestration, Persistence & API | Completed ✅ | 9 | 9/9 |

**Total Progress:** 24/24 tasks (100%)

## Story Boundaries

| Story | Layer | DB Access? | Files |
|-------|-------|------------|-------|
| 1 | Schema + Types | Migration only | `prisma/schema.prisma`, `lib/metrics/types.ts` |
| 2 | Pure Computation | None | `lib/metrics/calculators.ts`, `rag.ts`, `rolling.ts`, `aggregator.ts` |
| 3 | DB + HTTP Glue | Yes | `lib/metrics/snapshot.ts`, `orchestrator.ts`, `app/api/metrics/` |

## Story Dependencies

```
Story 1 (Schema + Types)
    │
    ↓
Story 2 (Pure Functions) ── depends on types.ts
    │
    ↓
Story 3 (Orchestration + API) ── depends on all pure functions + schema
```

- **Story 1** completed — schema, migration, types, and tests all passing
- **Story 2** completed — 4 calculators, RAG, rolling averages, program aggregation (59 tests passing)
- **Story 3** completed — orchestrator, snapshot persistence, sync hook, API routes (83 tests passing)

## Quick Links

- [Story 1: MetricSnapshot Schema, Types & Migration](./story-1-metric-snapshot-schema.md)
- [Story 2: Metric Calculators & Enrichment](./story-2-metric-calculators-and-enrichment.md)
- [Story 3: Orchestration, Persistence & API](./story-3-orchestration-persistence-and-api.md)

## External Dependencies

- **ADO Data Sync** must be complete (WorkItems + SprintWorkstream populated)
- **ThresholdConfig** seed data already exists for RAG thresholds
- **Prisma schema** and migrations are the starting point for Story 1
