# ADO Data Sync Specification

> Created: 2026-02-11
> Status: Planning
> Contract Locked: Yes

## Contract Summary

### Deliverable

Build an API-triggered ADO sync that reliably ingests rolling 5-sprint Yellow Box data (work items, iterations, and capacity) into the local Prisma/Postgres schema for downstream dashboard metrics.

### Must Include

The sync must persist Features, User Stories, Bugs, Spikes, and Support work items for all 4 Yellow Box workstreams, with per-workstream isolation and audit logging.

### Hardest Constraint

The live ADO iteration taxonomy and sprint naming in production data do not match the current seeded sprint paths, so sync logic must resolve real ADO paths without breaking existing local seed assumptions.

### Success Criteria

- Operator triggers sync via API route (manual control).
- Rolling 5-sprint data is stored for all 4 workstreams.
- Current sprint data is stored and available for projection metrics.
- Current sprint is excluded from rolling average calculations by contract rule.
- Sync failures in one workstream do not block others.
- SyncLog records run status, counts, and errors with retry attempts for transient failures.

### Scope Boundaries

- Included:
  - Manual API-triggered sync endpoint(s)
  - ADO iteration + work item + capacity ingestion
  - Mapping to existing `Workstream`, `Sprint`, `WorkItem`, and `SprintWorkstream` records
  - Moderate resiliency and sync observability via `SyncLog`
- Excluded:
  - Cron/scheduled sync
  - Full historical backfill beyond rolling 5 sprints
  - Metric engine implementation (except contract notes needed for averaging exclusion rule)
  - Dashboard UI buildout (except endpoint consumption by dashboard, tracked in `2026-02-12-program-dashboard-ui`)

### Technical Concerns

- Existing seed sprint paths use a pattern that does not match live ADO iteration paths (for example, `Sprint 1 Q3 FY26` vs `Sprint 26.21`), so sprint resolution must key off actual ADO iteration metadata.
- Umbrella team (`Unified LiveLink - Yellow Box`) may not directly own sprint work items; sub-teams are the source of truth.
- Capacity values are per-member per-day; aggregation rules must be explicit to avoid inconsistent `grossHours` values.

### Recommendations

- Treat ADO iteration identifier/path as canonical and only map to local sprint naming secondarily.
- Implement sync per workstream and per resource type (iterations/work items/capacity) with isolated try/catch blocks.
- Persist enough metadata to make re-runs idempotent and debuggable (`adoId`, revision checks, sync counters, error message capture).
- Add a small sync configuration surface (`lookbackSprintCount = 5`) in code to avoid hardcoded scattering.

## Detailed Requirements

## 1) Source Systems and Scope

- ADO org/project: `Operations-Innovation / Event Streaming Platform`
- Workstreams to ingest:
  - Streams
  - Pitch Tracker
  - Action Tracker
  - KPI Services + UCM
- Resource domains:
  - Iterations (rolling 5, includes current)
  - Work items (types: Feature, User Story, Bug, Spike, Support)
  - Capacity (auto-populated from ADO, manual override preserved)

## 2) Trigger and Execution Model

- Sync is manually initiated through API route (primary interaction for MVP).
- Sync route supports both direct operator invocation and dashboard UI invocation.
- Endpoint returns run status and summary counts.
- Sync run creates a `SyncLog` record on start and updates completion state.

## 3) Rolling Sprint Logic

- Include 5 total sprints in storage window: current sprint + 4 previous sprints.
- Current sprint records are stored and available for projections.
- Rolling average metrics must explicitly exclude current sprint (contract rule consumed by downstream metric engine).

## 4) Data Mapping Rules

### WorkItem mapping

- Use `adoId` as durable identity and update existing rows by `adoId`.
- Map ADO work item types to Prisma `WorkItemType` enum:
  - `Feature` -> `Feature`
  - `User Story` -> `UserStory`
  - `Bug` -> `Bug`
  - `Spike` -> `Spike`
  - `Support` -> `Support`
- Populate:
  - `adoRevision`, `title`, `state`, `storyPoints`
  - `areaPath`, `iterationPath`, `parentAdoId`
  - `assignedTo`, `tags`, `adoCreatedDate`, `adoChangedDate`
  - `workstreamId`, `sprintId` (resolved from area/iteration paths)

### Sprint mapping

- Resolve local `Sprint` using ADO iteration path and date metadata.
- If sprint does not exist locally, create it with ADO-derived values.
- Do not rely on seed naming pattern as canonical.

### Capacity mapping

- Pull team capacity for each workstream and included sprint.
- Aggregate per-member `capacityPerDay` and working days to derive hours.
- Write to `SprintWorkstream` (`grossHours` at minimum), keeping manual override capability intact.

## 5) Reliability and Error Handling

- Moderate resilience target:
  - Per-workstream isolation
  - Retry transient failures (network/timeouts/rate-limit style failures)
  - Continue processing remaining workstreams when one fails
- Log per-run totals:
  - fetched/created/updated counts
  - sync type
  - status
  - error summary on failure/partial failure

## 6) Idempotency and Re-runs

- Re-running sync should not duplicate work items.
- Revision-aware updates: update only when source revision changed when possible.
- Sprint and sprint-workstream upserts must remain deterministic.

## 7) Security and Access

- Sync endpoint intended for local operator use.
- No public exposure requirement in MVP.
- Errors should avoid leaking sensitive auth/session details.

## 8) Testing and Validation

- Unit tests for type mapping and sprint-window selection logic.
- Integration-style tests for upsert behavior against Prisma test DB.
- Validation run against one known sprint to confirm counts and mapping.
- Verify that current sprint is excluded from rolling average input set (contract guardrail).

## Story Plan

1. `story-1-ado-sync-orchestration-and-api.md`: Manual API trigger, sync orchestration, SyncLog lifecycle - Dependencies: None
2. `story-2-iteration-and-sprint-resolution.md`: Rolling 5-sprint selection, ADO iteration ingestion, local sprint mapping/upsert - Dependencies: Story 1
3. `story-3-work-item-ingestion-and-type-mapping.md`: Work item fetch/mapping/upsert for selected types and workstreams - Dependencies: Story 1, Story 2
4. `story-4-capacity-sync-resilience-and-validation.md`: Capacity aggregation, retry/isolation handling, validation/reporting - Dependencies: Story 1, Story 2, Story 3

## Implementation Approach

- Build a small ADO sync service layer in server-side code with explicit boundaries:
  - Iteration service
  - Work item service
  - Capacity service
  - Orchestrator
- Keep API route thin: validate request, call orchestrator, return summary.
- Use Prisma transactions where useful for local consistency, but avoid one giant transaction spanning all workstreams.
- Prepare output contracts compatible with later dashboard/metric engine consumption.
