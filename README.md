# LiveLink Health Report

Automated health reporting tool for the Unified LiveLink program. Built with [Next.js](https://nextjs.org/) (App Router), [Mantine](https://mantine.dev/), [Prisma](https://www.prisma.io/) ORM, and PostgreSQL.

## Features

- **Workstream & Sprint Management** — Track workstreams with ADO area paths, sprint definitions, and capacity data
- **Azure DevOps Integration** — Store raw ADO work items (Epics, Features, User Stories, Tasks, Bugs, Spikes, Support); **Iteration sync** fetches team iterations, selects rolling 5-sprint window, and upserts Sprint records by ADO iteration path
- **Metric Engine** — Compute velocity, overhead, predictability, and carry-over after sync; persist per-workstream snapshots and expose `GET /api/metrics` + `POST /api/metrics/compute`
- **Velocity Dashboard** — Program-level and per-workstream health cards with 4 metric tiles (Velocity, Velocity Rate, Overhead %, Carry-Over %), velocity trend line chart, per-sprint bug listings, and rolling average reference line
- **Per-Workstream Velocity Prediction** — Forecasted sprint velocity (avg velocity rate × current sprint capacity) shown as a dashed extension on the trend chart
- **ADP Milestone Tracking** — Monitor Annual Development Plan commitments linked to ADO Features with status progression and target months
- **Configurable RAG Thresholds** — Auto-calculated health status (Green/Amber/Red) from configurable per-metric thresholds
- **Sync Audit Trail** — Full audit logging for all ADO data synchronization operations
- **Ceremony Intelligence (Phase 2)** — Transcript storage and LLM-extracted insights from Teams ceremonies (Standup, Scrum of Scrums, Sprint Planning, Backlog Refinement)

## Current Story Progress

**Dashboard Metrics Audit: 31/31 tasks complete (100%)**

| Story | Title | Status |
|-------|-------|--------|
| 1 | Sprint-Actual Overhead % and Carry-Over % | Completed ✅ |
| 2 | Workstream Cards 2-Column Layout | Completed ✅ |
| 3 | Wire Overhead Composition Stacked Bar Chart | Completed ✅ |
| 4 | Milestone Section Quarterly Rework | Completed ✅ |
| 5 | Bug Page Dashboard Filter | Completed ✅ |

### Tech Stack

- [Next.js](https://nextjs.org/) 15 (App Router)
- [Mantine](https://mantine.dev/) UI framework
- [Prisma](https://www.prisma.io/) 6 ORM with PostgreSQL 16
- [PostCSS](https://postcss.org/) with [mantine-postcss-preset](https://mantine.dev/styles/postcss-preset)
- [TypeScript](https://www.typescriptlang.org/)
- [Jest](https://jestjs.io/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Docker](https://www.docker.com/) for local PostgreSQL
- [Storybook](https://storybook.js.org/)

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Or create `.env` file with:

   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/nextapp?schema=public"
   ```

3. **Start the database**

   ```bash
   pnpm run db:up
   ```

4. **Set up Prisma**

   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```

5. **Bootstrap or seed the database**

   ```bash
   pnpm run db:bootstrap
   ```

   Defaults are also created automatically on first Sync Now when workstreams are missing.
   For sample sprints too, run `pnpm run db:seed`.

6. **Start the development server**
   ```bash
   pnpm dev
   ```

## pnpm Scripts

### Build and Dev

- `dev` – start dev server
- `build` – bundle application for production
- `start` – start production server
- `analyze` – analyzes application bundle with [@next/bundle-analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

### Database

- `db:up` – start PostgreSQL container
- `db:down` – stop all Docker containers
- `db:reset` – reset database (removes all data and restarts container)
- `db:migrate` – run database migrations
- `db:migrate:deploy` – apply migrations and bootstrap defaults (CI/prod)
- `db:generate` – generate Prisma client
- `db:bootstrap` – restore default workstreams when table is empty
- `db:seed` – seed workstreams, thresholds, and sprints
- `db:push` – push schema changes to database (development only)

### Testing

- `typecheck` – checks TypeScript types
- `lint` – runs ESLint and Stylelint
- `eslint` – runs ESLint only
- `stylelint` – runs Stylelint only
- `prettier:check` – checks files with Prettier
- `jest` – runs jest tests
- `jest:watch` – starts jest watch
- `test` – runs `jest`, `prettier:check`, `lint` and `typecheck` scripts

### Other

- `storybook` – starts storybook dev server
- `storybook:build` – build production storybook bundle to `storybook-static`
- `prettier:write` – formats all files with Prettier

## Database Schema

This project uses PostgreSQL with Prisma ORM. The database runs in a Docker container for local development.

### Models (10 tables)

**Phase 1 — Core:**

| Model              | Table                | Purpose                                                                   |
| ------------------ | -------------------- | ------------------------------------------------------------------------- |
| `Workstream`       | `workstreams`        | 4 development workstreams with ADO area paths                             |
| `Sprint`           | `sprints`            | Sprint definitions with ADO iteration paths and date ranges               |
| `SprintWorkstream` | `sprint_workstreams` | Sprint capacity and planned/completed points per workstream               |
| `WorkItem`         | `work_items`         | Raw Azure DevOps work items (all types) synced from ADO                   |
| `Milestone`        | `milestones`         | ADP Commitment milestones linked to ADO Features                          |
| `ThresholdConfig`  | `threshold_configs`  | Configurable RAG thresholds per health metric                             |
| `SyncLog`          | `sync_logs`          | ADO sync audit trail with status and item counts                          |
| `MetricSnapshot`   | `metric_snapshots`   | Persisted per-sprint per-workstream metrics (with rolling averages + RAG) |

**Phase 2 — Ceremony Intelligence:**

| Model             | Table               | Purpose                                          |
| ----------------- | ------------------- | ------------------------------------------------ |
| `Transcript`      | `transcripts`       | Teams ceremony VTT file storage and metadata     |
| `CeremonyInsight` | `ceremony_insights` | LLM-extracted insights from ceremony transcripts |

### Enums

| Enum              | Values                                                    |
| ----------------- | --------------------------------------------------------- |
| `WorkItemType`    | Epic, Feature, UserStory, Task, Bug, Spike, Support       |
| `MilestoneStatus` | NotStarted, InProgress, Done                              |
| `SyncStatus`      | Running, Success, Failed                                  |
| `SyncType`        | WorkItems, Iterations, Capacity, Full                     |
| `CeremonyType`    | Standup, ScrumOfScrums, SprintPlanning, BacklogRefinement |
| `InsightType`     | Risk, Blocker, Dependency, Theme, Sentiment               |
| `Severity`        | High, Medium, Low                                         |

### Relationships

```
Workstream ──┬── SprintWorkstream ──── Sprint
             ├── WorkItem
             ├── Milestone
             ├── MetricSnapshot
             ├── Transcript
             └── CeremonyInsight

Sprint ──┬── SprintWorkstream
         ├── WorkItem
         ├── MetricSnapshot
         └── Transcript

Transcript ──── CeremonyInsight
```

### Seed Data

The seed script (`pnpm run db:seed`) creates:

- **5 Workstreams:** Streams, Pitch Tracker, Action Tracker, KPI Services, UCM
- **5 Threshold Configs:** sprintPredictability, carryOverRate, overheadPercent, agingWipDays, scopeCreepIndex (with Green/Amber/Red ranges)
- **6 Sprints:** 5 historical Q3 FY26 sprints + current Sprint 1 Q4 FY26

### Database Access

- **PostgreSQL:** `localhost:5433`
- **Username:** `postgres`
- **Password:** `postgres`
- **Database:** `nextapp`

### Using Prisma in Code

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
});

// Check RAG threshold for a metric
const threshold = await prisma.thresholdConfig.findUnique({
  where: { metricName: 'sprintPredictability' },
});
```

### Schema Changes

When you modify the Prisma schema:

1. Edit `prisma/schema.prisma`
2. Create and apply migration: `pnpm run db:migrate`
3. Generate updated client: `pnpm run db:generate`

For development-only changes, you can use: `pnpm run db:push`

## Metric Calculations

Core metrics are computed after sync and persisted in `MetricSnapshot` (not recomputed on every dashboard read):

| Metric                    | Formula                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| **Velocity**              | SUM(storyPoints) for completed UserStories in a sprint/workstream   |
| **Sprint Predictability** | completedPoints / plannedPoints                                     |
| **Carry-Over Rate**       | carryOverPoints / plannedPoints                                     |
| **Overhead %**            | (ceremonyHours + bugHours + spikeHours + supportHours) / grossHours |
| **Bug Hours**             | SUM(completedWork or originalEstimate) for Bugs                     |
| **Spike Hours**           | SUM(storyPoints) for Spikes (1 point = 1 hour)                      |
| **Support Hours**         | SUM(completedWork or originalEstimate) for Support items            |

### Metric APIs

- `GET /api/metrics` - Returns per-workstream metrics for the latest sprint with snapshots (or by `sprintId`)
- `POST /api/metrics/compute` - Triggers metric computation for a sprint (or latest by end date)

See `docs/API.md` and `docs/features/metric-engine.md` for full request/response details.

## Docker Commands

```bash
# Start database (detached mode)
pnpm run db:up

# View logs
docker-compose logs postgres

# Stop containers
pnpm run db:down

# Reset database (removes all data)
pnpm run db:reset

# Connect to database directly
docker exec -it next-app-postgres psql -U postgres -d nextapp
```

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # Reusable components
│   └── Dashboard/          # Dashboard UI components
│       ├── DashboardShell.tsx         # Top-level dashboard container
│       ├── WorkstreamHealthCard.tsx   # Per-workstream card (4 metrics + chart + bugs)
│       ├── VelocityTrendChart.tsx     # Mantine LineChart with prediction extension
│       └── SprintBugList.tsx          # Per-sprint bug listing with strikethrough
├── lib/                    # Utility libraries
│   ├── prisma.ts           # Prisma client instance
│   └── dashboard/          # Dashboard data layer
│       ├── types.ts        # API response + view model types
│       └── adapter.ts      # Maps API response to view models
├── prisma/                 # Database schema and migrations
│   ├── schema.prisma       # Database schema (10 models, 7 enums)
│   ├── migrations/         # Database migrations
│   └── seed.ts             # Seed script (workstreams, thresholds, sprints)
├── __tests__/              # Test suites
│   ├── components/         # React component tests (102 tests)
│   ├── lib/                # Library unit tests
│   └── prisma/             # Prisma model tests
├── docker/                 # Docker configuration
├── docs/                   # Documentation
│   ├── API.md              # Sync + metrics API contracts and schemas
│   └── DATABASE_SETUP.md   # Detailed database setup guide
└── .writ/                  # Specifications, docs, and decision records
    ├── specs/              # Feature specifications
    └── docs/               # Tech stack, code style, architecture docs
```

## Program Context

- **Program:** Unified LiveLink
- **ADO Org/Project:** Operations-Innovation / Event Streaming Platform
- **Team:** Yellow Boxers
- **Sprint cadence:** 2-week, synchronized
- **Workstreams:** Streams, Pitch Tracker, Action Tracker, KPI Services, UCM

## Troubleshooting

- **Port 5433 already in use**: Stop existing PostgreSQL service or change port in `docker-compose.yml`
- **Connection errors**: Ensure Docker container is running with `pnpm run db:up`
- **Migration errors**: Try `pnpm run db:reset` to start fresh
- **Prisma Client errors**: Run `pnpm run db:generate` to regenerate the client

For detailed database setup instructions, see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md). For the ADO sync API contract and SyncLog schema, see [docs/API.md](docs/API.md).
