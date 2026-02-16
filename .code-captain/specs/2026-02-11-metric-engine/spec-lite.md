# Metric Calculation Engine Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-11
> Contract Locked: ✅

## Core Objective

Compute 4 sprint health metrics (Velocity, Overhead%, Predictability, Carry-Over) from raw WorkItem + SprintWorkstream data, persist in MetricSnapshot table, assign RAG colors from ThresholdConfig, expose via API. Triggered after each ADO sync.

## Metric Formulas

| Metric | Formula | Source |
|---|---|---|
| Velocity | SUM(storyPoints) of Done-like items (Closed, Done, Resolved) | WorkItem |
| Overhead% | (ceremonyHours + bugHours + spikeHours + supportHours) / grossHours × 100 | WorkItem + SprintWorkstream |
| Predictability | completedPoints / plannedPoints × 100 | WorkItem (both numerator and denominator) |
| Carry-Over | SUM(SP of incomplete items) / plannedPoints × 100 | WorkItem |

## Key Rules

- **Done-like states:** Closed, Done, Resolved
- **Overhead sources:** Bug/Support → completedWork ?? originalEstimate ?? 0; Spike → storyPoints × 1 (SP=hour); ceremonyHours from SprintWorkstream
- **Rolling average:** 4 prior sprints, current excluded; arithmetic mean
- **Program aggregate:** Weighted average by total SP per workstream (computed on-the-fly, not stored)
- **Velocity RAG:** Trend-based (≥ avg = Green, 70-99% = Amber, < 70% = Red)
- **Other RAG:** From ThresholdConfig thresholds (sprintPredictability, carryOverRate, overheadPercent)
- **Edge cases:** Null grossHours → overhead null; 0 plannedPoints → predictability/carry-over null; < 2 sprints → velocity RAG null

## MetricSnapshot Table

Per-workstream per-sprint record: velocity, overheadPercent, predictability, carryOverRate, carryOverItems, carryOverPoints, plannedPoints, completedPoints, overheadHours, grossHours, rolling averages (velocityAvg, overheadPercentAvg, predictabilityAvg, carryOverRateAvg), RAG strings, computedAt. Unique on [sprintId, workstreamId].

## File Structure

```
lib/metrics/
  calculators.ts    — Pure metric functions (velocity, overhead, predictability, carry-over)
  rag.ts            — ThresholdConfig lookup + RAG assignment
  rolling.ts        — Rolling average across 4-sprint window
  aggregator.ts     — Program-level weighted aggregation
  snapshot.ts       — MetricSnapshot upsert
  orchestrator.ts   — Coordinates full pipeline
  types.ts          — TypeScript interfaces
app/api/metrics/
  route.ts          — GET /api/metrics (read snapshots)
  compute/route.ts  — POST /api/metrics/compute (trigger computation)
```

## Computation Flow

1. Sync completes → calls `computeMetrics(sprintId)`
2. Per workstream: query WorkItems → compute 4 metrics → fetch prior snapshots → rolling avg → RAG → upsert MetricSnapshot
3. Metric errors don't fail sync — logged separately

## API

- `GET /api/metrics?sprintId=&workstreamId=&includeRolling=true&includeProgram=true`
- `POST /api/metrics/compute` — body: `{ sprintId? }`

## Story Breakdown

1. MetricSnapshot schema, types & migration (schema layer)
2. Metric calculators & enrichment — all pure functions: velocity, overhead, predictability, carry-over, RAG, rolling averages, program aggregation (computation layer)
3. Orchestration, persistence & API — pipeline coordination, sync hook, snapshot upsert, GET + POST routes (DB + HTTP layer)

## Dependencies

- ADO Data Sync (WorkItems + SprintWorkstream populated)
- ThresholdConfig seed data (already exists)
