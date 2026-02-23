# Technical Specification — ADO Data Sync

## Overview

This document defines the technical implementation of the ADO data sync feature for Phase 1 MVP. The system syncs rolling 5-sprint data for 4 Yellow Box workstreams using manual API trigger and stores results in Prisma/Postgres.

Related user stories:
- Story 1: API orchestration and run logging
- Story 2: Iteration ingestion and sprint resolution
- Story 3: Work item ingestion and type mapping
- Story 4: Capacity sync and resilience

## Architecture

## Proposed modules

- `lib/sync/orchestrator.ts` *(Story 1 implemented)*
  - Entry point for one sync run.
  - Creates/updates `SyncLog`.
  - Coordinates workstreams and phases.
  - Per-workstream try/catch isolation; stub sync phases in Story 1.
- `lib/sync/iterations.ts`
  - Resolves rolling 5-sprint iteration window.
  - Upserts local `Sprint` records.
- `lib/sync/work-items.ts`
  - Fetches and maps approved work item types.
  - Upserts `WorkItem` rows by `adoId`.
- `lib/sync/capacity.ts`
  - Pulls team capacity per iteration/workstream.
  - Aggregates values into `SprintWorkstream`.
- `app/api/sync/ado/route.ts` *(Story 1 implemented)*
  - Manual trigger endpoint for operator.
  - Returns `{ success, syncLogId, summary }`.

## Sync flow

1. API route receives manual trigger request.
2. Orchestrator creates `SyncLog` with `Running`.
3. For each workstream:
   - Resolve rolling 5 iterations.
   - Upsert `Sprint` records.
   - Sync work items for approved types.
   - Sync capacity for same sprint set.
4. Per-workstream failures are captured and isolated.
5. Orchestrator updates `SyncLog` with `Success` or `Failed` and counters.

## Rolling sprint logic

- Determine current sprint from team iteration settings (`timeFrame = current`) when available.
- Build ordered list: current + 4 previous sprints.
- Persist all 5 into local storage.
- Mark current sprint in sync output metadata to enforce downstream exclusion from rolling averages.

## Mapping strategy

## Workstream mapping

Map by `System.AreaPath` prefix to seeded workstream records:
- `...\\Streams`
- `...\\Pitch Tracker`
- `...\\Action Tracker`
- `...\\Tier Boards` (KPI Services)
- `...\\Unified Configuration Manager` (UCM)

## Work item type mapping

Allowed ADO types:
- `Feature` -> `Feature`
- `User Story` -> `UserStory`
- `Bug` -> `Bug`
- `Spike` -> `Spike`
- `Support` -> `Support`

All other types are skipped.

## Sprint mapping

- Canonical key is ADO iteration path.
- If local sprint does not exist, create with ADO-derived name/path/date.
- Existing seed name mismatch is tolerated; sync prefers live ADO metadata.

## Capacity aggregation

- Aggregate member activities from team capacity endpoint.
- Convert daily capacity and sprint days into `grossHours`.
- Respect manual override lock behavior:
  - if `capacityLocked = true`, preserve manual value unless explicit override flag is passed.

## Idempotency

- WorkItem upsert by unique `adoId`.
- Update only when source revision or mutable fields change.
- Sprint and SprintWorkstream upserts keyed by unique constraints.

## Resilience strategy

- Per-workstream try/catch boundaries.
- Retry transient errors with bounded attempts and backoff.
- Continue other workstreams after single-workstream failure.
- Summary includes success/failure by workstream and by phase.

## Test strategy

- Unit tests:
  - rolling sprint window selection
  - work item type mapping
  - area path to workstream mapping
  - capacity aggregation math
- Integration tests:
  - Prisma upsert behavior (`WorkItem`, `Sprint`, `SprintWorkstream`)
  - SyncLog lifecycle updates
- Contract tests:
  - current sprint is flagged and excluded from rolling-average input set

## Risks and mitigations

- ADO path and naming drift:
  - Mitigation: path-based matching + tolerant fallback matching rules.
- Partial availability of capacity data:
  - Mitigation: per-workstream warnings and non-blocking behavior.
- API timeout/rate limit:
  - Mitigation: bounded retry and incremental logging.
