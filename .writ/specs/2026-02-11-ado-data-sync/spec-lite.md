# ADO Data Sync Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-11
> Contract Locked: Yes

## Core Objective

Implement a manual API-triggered ADO sync that ingests rolling 5-sprint data (current + 4 previous) for Yellow Box workstreams into Prisma/Postgres.

## Locked Requirements

- Trigger: Manual API route.
- Trigger consumers: Direct operator call or dashboard "Sync Now" UI action.
- Sprint window: Rolling 5 sprints, include current sprint in storage/projections.
- Metric rule: Exclude current sprint from rolling average calculations.
- Capacity: Auto-populate from ADO capacity API with manual override capability.
- Work item types: Feature, User Story, Bug, Spike, Support.
- Error handling: Moderate (per-workstream isolation, retries for transient failures, SyncLog audit trail).

## Critical Constraints

- Live ADO iteration naming/path differs from existing seed assumptions.
- Umbrella Yellow Box team may not hold direct sprint work items; sub-teams do.

## Data Model Touchpoints

- `Sprint`: map/upsert from ADO iteration metadata.
- `WorkItem`: upsert by `adoId`, revision-aware updates.
- `SprintWorkstream`: persist aggregated capacity fields (`grossHours` minimum).
- `SyncLog`: start/end status, counts, error summaries.

## Story Breakdown

1. Sync API orchestration and logging
2. Iteration ingestion and local sprint resolution
3. Work item ingestion and type mapping
4. Capacity aggregation, resilience, and validation
