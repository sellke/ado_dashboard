# Database Setup Guide

This project uses PostgreSQL 16 with Prisma 6 ORM. The database runs in a Docker container for local development.

## Prerequisites

- Docker and Docker Compose installed
- Node.js (see `.nvmrc` for version) and pnpm installed

## Quick Start

1. **Create environment file**

   ```bash
   cp .env.example .env
   ```

   Or create `.env` file manually with:

   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nextapp?schema=public"
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start PostgreSQL database**

   ```bash
   pnpm run db:up
   ```

4. **Generate Prisma client and run migrations**

   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```

5. **Seed the database**

   ```bash
   pnpm run db:seed
   ```

   This creates:
   - 4 workstreams (Streams, Pitch Tracker, Action Tracker, KPI Services + UCM)
   - 5 RAG threshold configs (sprintPredictability, carryOverRate, overheadPercent, agingWipDays, scopeCreepIndex)
   - 6 sprints (5 historical Q3 FY26 + current Sprint 1 Q4 FY26)

## Available Scripts

| Script                 | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `pnpm run db:up`       | Start PostgreSQL container                       |
| `pnpm run db:down`     | Stop all containers                              |
| `pnpm run db:reset`    | Reset database (removes all data)                |
| `pnpm run db:migrate`  | Run database migrations                          |
| `pnpm run db:generate` | Generate Prisma client                           |
| `pnpm run db:studio`   | Open Prisma Studio (database GUI)                |
| `pnpm run db:seed`     | Seed database with workstreams, thresholds, sprints |
| `pnpm run db:push`     | Push schema changes to database (dev only)       |

## Database Access

- **PostgreSQL:** `localhost:5433`
- **Username:** `postgres`
- **Password:** `postgres`
- **Database:** `nextapp`
- **Connection URL:** `postgresql://postgres:postgres@localhost:5433/nextapp?schema=public`

## Schema Overview

The database contains 9 models and 7 enums, organized across two phases:

### Phase 1 — Core Models

| Model | Table | Purpose |
|---|---|---|
| `Workstream` | `workstreams` | Development workstreams with ADO area paths |
| `Sprint` | `sprints` | Sprint definitions with ADO iteration paths and date ranges |
| `SprintWorkstream` | `sprint_workstreams` | Junction: capacity, planned/completed points per workstream per sprint |
| `WorkItem` | `work_items` | Raw Azure DevOps work items (Epic, Feature, UserStory, Task, Bug, Spike, Support) |
| `Milestone` | `milestones` | ADP Commitment milestones linked to ADO Features |
| `ThresholdConfig` | `threshold_configs` | Configurable RAG thresholds per health metric |
| `SyncLog` | `sync_logs` | ADO sync audit trail; includes `perWorkstreamSummary` JSON for per-workstream counts |

### Phase 2 — Ceremony Intelligence

| Model | Table | Purpose |
|---|---|---|
| `Transcript` | `transcripts` | Teams ceremony VTT file storage and metadata |
| `CeremonyInsight` | `ceremony_insights` | LLM-extracted insights from ceremony transcripts |

### Enums

| Enum | Values |
|---|---|
| `WorkItemType` | Epic, Feature, UserStory, Task, Bug, Spike, Support |
| `MilestoneStatus` | NotStarted, InProgress, Done |
| `SyncStatus` | Running, Success, Failed |
| `SyncType` | WorkItems, Iterations, Capacity, Full |
| `CeremonyType` | Standup, ScrumOfScrums, SprintPlanning, BacklogRefinement |
| `InsightType` | Risk, Blocker, Dependency, Theme, Sentiment |
| `Severity` | High, Medium, Low |

### Relationships

```
Workstream ──┬── SprintWorkstream ──── Sprint
             ├── WorkItem
             ├── Milestone
             ├── Transcript
             └── CeremonyInsight

Sprint ──┬── SprintWorkstream
         ├── WorkItem
         └── Transcript

Transcript ──── CeremonyInsight
```

### Index Strategy

| Table | Index | Columns | Purpose |
|---|---|---|---|
| `work_items` | Unique | `adoId` | ADO sync lookup key |
| `work_items` | Composite | `workstreamId`, `sprintId` | Metric queries by workstream + sprint |
| `work_items` | Single | `type` | Filter by work item type |
| `work_items` | Single | `iterationPath` | ADO iteration path lookups |
| `sprint_workstreams` | Unique Composite | `sprintId`, `workstreamId` | Prevent duplicate capacity entries |
| `milestones` | Single | `workstreamId` | Milestone queries by workstream |
| `threshold_configs` | Unique | `metricName` | One config per metric |
| `sync_logs` | Single | `startedAt` | Recent sync lookups |

### SyncLog and perWorkstreamSummary

`SyncLog` records each ADO sync run. The `perWorkstreamSummary` JSONB field stores per-workstream execution results: `{ workstreamId, status, itemsFetched, itemsCreated, itemsUpdated, error? }`. See [docs/API.md](./API.md) for full schema and lifecycle.

## Usage in Code

```typescript
import { prisma } from '@/lib/prisma';

// Get all workstreams
const workstreams = await prisma.workstream.findMany();

// Get sprint with capacity data
const sprint = await prisma.sprint.findUnique({
  where: { id: 'sprint-id' },
  include: { sprintWorkstreams: true },
});

// Get work items for a workstream in a sprint
const workItems = await prisma.workItem.findMany({
  where: { workstreamId: 'ws-id', sprintId: 'sprint-id' },
});

// Get milestones by workstream
const milestones = await prisma.milestone.findMany({
  where: { workstreamId: 'ws-id' },
  include: { workstream: true },
});

// Check RAG threshold for a metric
const threshold = await prisma.thresholdConfig.findUnique({
  where: { metricName: 'sprintPredictability' },
});

// Get recent sync logs
const recentSyncs = await prisma.syncLog.findMany({
  orderBy: { startedAt: 'desc' },
  take: 10,
});

// Get transcript with insights (Phase 2)
const transcript = await prisma.transcript.findUnique({
  where: { id: 'transcript-id' },
  include: { ceremonyInsights: true, sprint: true },
});
```

## Schema Changes

When you modify the Prisma schema:

1. Edit `prisma/schema.prisma`
2. Run `pnpm run db:migrate` to create migration
3. Run `pnpm run db:generate` to update Prisma client

For development-only changes: `pnpm run db:push`

## Seed Data Details

### Workstreams

| Name | ADO Area Path |
|---|---|
| Streams | `Event Streaming Platform\App\LiveLink - Yellow Box\Streams` |
| Pitch Tracker | `Event Streaming Platform\App\LiveLink - Yellow Box\Pitch Tracker` |
| Action Tracker | `Event Streaming Platform\App\LiveLink - Yellow Box\Action Tracker` |
| KPI Services + UCM | `Event Streaming Platform\App\LiveLink - Yellow Box\Tier Boards` |

### RAG Threshold Defaults

| Metric | Green | Amber | Red |
|---|---|---|---|
| sprintPredictability | 80–100% | 60–79.99% | 0–59.99% |
| carryOverRate | 0–10% | 10.01–25% | 25.01–100% |
| overheadPercent | 0–30% | 30.01–45% | 45.01–100% |
| agingWipDays | 0–5 days | 5.01–10 days | 10.01–999 days |
| scopeCreepIndex | 0–10% | 10.01–20% | 20.01–100% |

### Sprints

| Sprint | Start Date | End Date |
|---|---|---|
| Sprint 1 Q3 FY26 | 2025-10-14 | 2025-10-27 |
| Sprint 2 Q3 FY26 | 2025-10-28 | 2025-11-10 |
| Sprint 3 Q3 FY26 | 2025-11-11 | 2025-11-24 |
| Sprint 4 Q3 FY26 | 2025-11-25 | 2025-12-08 |
| Sprint 5 Q3 FY26 | 2025-12-09 | 2025-12-22 |
| Sprint 1 Q4 FY26 | 2026-01-06 | 2026-01-19 |

## Troubleshooting

- **Port 5433 already in use**: Stop existing PostgreSQL service or change port in `docker-compose.yml`
- **Connection errors**: Ensure Docker container is running with `pnpm run db:up`
- **Migration errors**: Try `pnpm run db:reset` to start fresh
- **Prisma Client errors**: Run `pnpm run db:generate` to regenerate the client
- **Seed script errors**: Ensure migrations are applied first with `pnpm run db:migrate`

## Direct Database Access

```bash
# Connect via Docker
docker exec -it next-app-postgres psql -U postgres -d nextapp

# Useful psql commands
\dt              # List all tables
\d workstreams   # Describe workstreams table
\d work_items    # Describe work_items table

# Query examples
SELECT * FROM workstreams;
SELECT * FROM threshold_configs;
SELECT * FROM sprints ORDER BY start_date;
```
