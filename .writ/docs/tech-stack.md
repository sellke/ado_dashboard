# Technology Stack

> Last Updated: 2026-03-20

## Languages

- **TypeScript** 5.8.3 — Primary language, strict mode enabled
- **JavaScript** (CJS/MJS) — Config files only (Jest, PostCSS, ESLint, Prettier, scripts)

## Frameworks & Libraries

### Core

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.3.3 | Full-stack React framework (App Router) |
| React | 19.1.0 | UI rendering library |
| Mantine | 8.2.1 | Component library and design system (@mantine/core, @mantine/hooks) |
| Prisma | 6.3.0 | Database ORM, migrations, and client generation |
| PostgreSQL | 16 (Alpine) | Relational database (Dockerized for local dev) |

### Charts

| Technology | Version | Purpose |
|---|---|---|
| Recharts | ^2.15.4 | SVG chart rendering (migrated from @mantine/charts in v0.1.0) |
| lib/charts/ | — | Thin wrappers (`AppLineChart`, `AppBarChart`, `AppAreaChart`) with Mantine theme integration, dark mode support, tooltips, legends, and escape hatches for raw Recharts props |

### Supporting

| Technology | Version | Purpose |
|---|---|---|
| @tabler/icons-react | ^3.34.0 | Icon library |
| @next/bundle-analyzer | ^15.3.3 | Bundle size analysis |
| PostCSS | ^8.5.5 | CSS processing (Mantine preset + simple-vars for breakpoints) |

## Infrastructure

### Database

- **PostgreSQL 16 Alpine** — Runs in Docker container via docker-compose
- **Port**: 5433 (host) → 5432 (container)
- **Database name**: `nextapp`
- **Credentials**: `postgres:postgres` (local dev only)
- **Connection URL**: `postgresql://postgres:postgres@localhost:5433/nextapp?schema=public`
- **Prisma Migrations**: Standard migration workflow in `prisma/migrations/` (11 migrations)
- **Models**: 12 tables — Workstream, Sprint, SprintWorkstream, WorkItem, Milestone, ThresholdConfig, SyncLog, MetricSnapshot, SprintPlanSnapshot, Transcript, CeremonyInsight

### External Integrations

- **Azure DevOps (ADO)** — Work item sync, iteration sync, capacity sync via REST API
  - Org: `Operations-Innovation`, Project: `Event Streaming Platform`
  - PAT-based authentication (stored in `.env`)
  - Sync types: WorkItems, Iterations, Capacity, Full

### Containerization

- **Docker Compose** v3.8 — Manages PostgreSQL service only (app runs natively)
- Named volume `postgres_data` for persistent storage
- Init SQL script: `docker/postgres/init.sql`
- Health check configured with `pg_isready`

### CI/CD

- **None** — Solo local project, no CI pipeline configured
- Quality checks run locally via `pnpm test` (prettier → lint → typecheck → jest)

## Development Tools

| Tool | Version | Purpose |
|---|---|---|
| pnpm | (workspace) | Package manager with workspace support |
| Node.js | 22.17.1 | Runtime (pinned via `.nvmrc`) |
| Jest | ^30.0.0 | Unit/component testing (71 test files) |
| React Testing Library | ^16.3.0 | Component testing utilities |
| Storybook | ^8.6.8 | Component development and visual docs (with dark mode addon) |
| ESLint | ^9.29.0 | Code linting (flat config, eslint-config-mantine) |
| Stylelint | ^16.20.0 | CSS linting |
| Prettier | ^3.5.3 | Code formatting (with @ianvs/prettier-plugin-sort-imports) |
| tsx | ^4.20.3 | TypeScript execution (seeds, scripts) |
| Playwright | ^1.58.2 | E2E testing (installed, not actively used yet) |

## Architecture Pattern

**Monolithic Next.js App Router Application**

- Server-first rendering with React Server Components for pages/layouts
- Client Components (`'use client'`) for interactive dashboard UI
- Collocated REST API routes (`app/api/`) with Prisma for data access
- **Adapter pattern** — `lib/dashboard/adapter.ts` maps API responses to view models; pure transformations with no metric math
- **Container/Presentational split** — `DashboardContainer` (client, fetches data) → `DashboardShell` (handles loading/error/success) → presentational components
- Custom chart library (`lib/charts/`) wrapping Recharts with Mantine theming
- Metric engine (`lib/metrics/`) with calculators, aggregator, orchestrator, and snapshot persistence
- ADO sync orchestrator (`lib/sync/`) for Azure DevOps data ingestion

## Key Configuration

- **TypeScript**: Strict mode, `@/*` path alias, ES5 target, incremental compilation
- **Next.js**: `reactStrictMode: false`, optimized Mantine package imports, ESLint ignored during builds
- **Prettier**: 100 char print width, single quotes, ES5 trailing commas, Mantine-aware import sorting
- **ESLint**: Flat config with eslint-config-mantine base, TypeScript-ESLint, console allowed in `.story.tsx`
- **PostCSS**: Mantine preset with standard breakpoint variables (xs: 36em through xl: 88em)
- **Jest**: `maxWorkers: 1` (serialized for Prisma DB tests), jsdom environment, `@/` path aliases
