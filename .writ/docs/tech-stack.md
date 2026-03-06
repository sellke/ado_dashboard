# Technology Stack

## Languages

- **TypeScript** 5.8.3 — Primary language, strict mode enabled
- **JavaScript** (CJS) — Used for Jest and PostCSS config files only

## Frameworks & Libraries

### Core

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15.3.3 | Full-stack React framework (App Router) |
| React | 19.1.0 | UI rendering library |
| Mantine | 8.2.1 | Component library and design system |
| Prisma | 6.3.0 | Database ORM and migrations |
| PostgreSQL | 16 (Alpine) | Relational database (Dockerized) |

### Charts

| Technology | Version | Purpose |
|---|---|---|
| Recharts | ^2.15.4 | SVG chart rendering (used directly via `lib/charts/` wrappers) |
| lib/charts/ | — | Thin wrappers (AppLineChart, AppBarChart, AppAreaChart) with Mantine theme integration, dark mode, and escape hatches |

### Supporting

| Technology | Version | Purpose |
|---|---|---|
| @tabler/icons-react | ^3.34.0 | Icon library |
| @next/bundle-analyzer | ^15.3.3 | Bundle size analysis |
| PostCSS | ^8.5.5 | CSS processing (Mantine preset + simple-vars) |

## Infrastructure

### Database

- **PostgreSQL 16 Alpine** — Runs in Docker container
- **Port**: 5433 (host) → 5432 (container)
- **Database name**: `nextapp`
- **Credentials**: `postgres:postgres` (local dev only)
- **Connection URL**: `postgresql://postgres:postgres@localhost:5433/nextapp?schema=public`
- **Prisma Migrations**: Standard migration workflow in `prisma/migrations/`

### Containerization

- **Docker Compose** v3.8 — Manages PostgreSQL service
- Named volume `postgres_data` for persistent storage
- Init SQL script for bootstrap: `docker/postgres/init.sql`
- Health check configured with `pg_isready`

### CI/CD

- **None** — Solo local project, no CI pipeline configured
- Quality checks run locally via `pnpm test`

## Development Tools

| Tool | Version | Purpose |
|---|---|---|
| pnpm | (workspace) | Package manager |
| Jest | ^30.0.0 | Unit/component testing |
| React Testing Library | ^16.3.0 | Component testing utilities |
| Storybook | ^8.6.8 | Component development and docs |
| ESLint | ^9.29.0 | Code linting (eslint-config-mantine) |
| Stylelint | ^16.20.0 | CSS linting |
| Prettier | ^3.5.3 | Code formatting (with import sorting) |
| tsx | ^4.20.3 | TypeScript execution (used for seeding) |

## Architecture Pattern

**Monolithic Next.js App Router Application**

- Server-first rendering with React Server Components
- Collocated API routes (`app/api/`)
- Prisma singleton for database access (`lib/prisma.ts`)
- Component-based UI architecture (`components/`)
- CSS Modules for component-scoped styling
- Custom test utilities wrapping RTL with Mantine provider

## Key Configuration

- **TypeScript**: Strict mode, `@/*` path alias, ES5 target
- **Next.js**: `reactStrictMode: false`, optimized Mantine package imports, ESLint ignored during builds
- **Prettier**: 100 char print width, single quotes, ES5 trailing commas, Mantine-aware import sorting
- **ESLint**: Mantine config base, TypeScript-ESLint, console allowed in stories
- **PostCSS**: Mantine preset with standard breakpoint variables
