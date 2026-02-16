# Database Schema Specification (Lite)

> Source: Complete spec.md
> Purpose: Efficient AI context for development

## Core Objective

Replace boilerplate User/Post Prisma schema with 10 models supporting the LiveLink Health Report: raw ADO work item storage, sprint capacity/snapshot tracking, ADP Commitment milestones, configurable RAG thresholds, sync audit logs, and Phase 2 transcript/insight tables.

## Key Design Decisions

- **Raw data only** — Store ADO work items as-is, calculate metrics on the fly (no pre-computed snapshots)
- **Manual sprint snapshots** — Operator enters plannedPoints/completedPoints per workstream per sprint
- **Capacity from ADO MCP** — With manual override; capacity locks ~3 days into sprint
- **ADP Commitments** — Milestones are ADO Features tagged "ADP Commitment", linked by ADO Feature ID
- **Auto RAG** — Calculated from configurable thresholds (no manual override); defaults: Green 80-100%, Amber 60-79%, Red <60%
- **Single program** — No Program table; Workstream is top-level entity
- **Phase 2 included** — Transcript + CeremonyInsight tables created now to avoid future migration

## Models (10 tables)

| Model | Key Fields | Phase |
|---|---|---|
| Workstream | name, adoAreaPath | 1 |
| Sprint | name, adoIterationPath, startDate, endDate | 1 |
| SprintWorkstream | plannedPoints, completedPoints, grossHours, ptoHours, fteCount, capacityLocked | 1 |
| WorkItem | adoId (unique), type (enum), state, storyPoints, completedWork, areaPath, iterationPath, parentAdoId | 1 |
| Milestone | adoFeatureId, targetMonth, status (enum), workstreamId | 1 |
| ThresholdConfig | metricName (unique), greenMin/Max, amberMin/Max, redMin/Max | 1 |
| SyncLog | syncType, status, itemsFetched/Created/Updated, errorMessage | 1 |
| Transcript | ceremonyType (enum), rawContent, sprintId, processedAt | 2 |
| CeremonyInsight | insightType (enum), severity (enum), content, transcriptId | 2 |

## Conventions

- CUID IDs: `@default(cuid())`
- Snake_case tables: `@@map("table_name")`
- Enums: WorkItemType, MilestoneStatus, SyncStatus, SyncType, CeremonyType, InsightType, Severity
- Timestamps: createdAt + updatedAt on all models

## Metric Queries (from raw WorkItem data)

- Velocity: SP in Done-like states per sprint/workstream
- Overhead%: (ceremony + bug + spike + support hours) / gross hours
- Predictability: completedPoints / plannedPoints (from SprintWorkstream)
- Carry-over: (planned - completed) / planned

## Seed Data

- 4 workstreams with ADO area paths
- Default RAG thresholds for all health metrics
- 5 historical sprints + current Sprint 1 Q4 FY26
