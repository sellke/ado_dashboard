# System Architecture

## Overview

This is a **Next.js 15 App Router** monolithic application using **Mantine 8** for UI, **Prisma 6** as ORM, and **PostgreSQL 16** for data persistence. Developed as a **solo local project** — no CI/CD pipeline, no remote deployment targets. The project is named "automated-report" but currently contains template/boilerplate code from the Mantine Next.js template.

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│                   Client                     │
│              (Browser / React)               │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│            Next.js App Router                │
│  ┌────────────────┐  ┌───────────────────┐  │
│  │ Server          │  │ Client            │  │
│  │ Components      │  │ Components        │  │
│  │ (pages, layouts)│  │ ('use client')    │  │
│  └────────┬───────┘  └───────────────────┘  │
│           │                                  │
│  ┌────────▼───────┐                         │
│  │ API Routes      │                        │
│  │ (app/api/)      │                        │
│  └────────┬───────┘                         │
└───────────┼─────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────┐
│         Prisma ORM (lib/prisma.ts)           │
│         Singleton Client Instance            │
└───────────┬─────────────────────────────────┘
            │
┌───────────▼─────────────────────────────────┐
│        PostgreSQL 16 (Docker)                │
│        localhost:5433 / nextapp              │
└─────────────────────────────────────────────┘
```

## Data Flow Patterns

### Pattern 1: Server Component Direct Access

Server Components query the database directly via Prisma, bypassing API routes entirely. This is the primary pattern used for data display pages.

```
Page (Server Component) → Prisma Client → PostgreSQL → Rendered HTML
```

### Pattern 2: API Route Access

API routes (`app/api/`) expose REST endpoints for client-side data fetching or external consumers.

```
Client → fetch('/api/...') → API Route Handler → Prisma → PostgreSQL → JSON Response
```

## Database Schema

### Current Models

**Phase 1 — Core (7 models):**
- **Workstream** (`workstreams`): `id`, `name`, `adoAreaPath`, timestamps
- **Sprint** (`sprints`): `id`, `name`, `adoIterationPath`, `startDate`, `endDate`, timestamps
- **SprintWorkstream** (`sprint_workstreams`): `id`, `sprintId`, `workstreamId`, `plannedPoints`, `completedPoints`, `grossHours`, `ptoHours`, `ceremonyHours`, `fteCount`, `capacityLocked`, `notes`, timestamps — @@unique([sprintId, workstreamId])
- **WorkItem** (`work_items`): `id`, `adoId` (unique), `type`, `title`, `state`, `storyPoints`, `areaPath`, `iterationPath`, `parentAdoId`, `assignedTo`, `tags`, timestamps
- **Milestone** (`milestones`): `id`, `title`, `adoFeatureId`, `workstreamId`, `targetMonth`, `status`, `notes`, timestamps
- **ThresholdConfig** (`threshold_configs`): `id`, `metricName` (unique), `greenMin/Max`, `amberMin/Max`, `redMin/Max`, timestamps
- **SyncLog** (`sync_logs`): `id`, `syncType`, `status`, `itemsFetched/Created/Updated`, `errorMessage`, `perWorkstreamSummary` (includes `capacitySummary` when capacity sync runs), timestamps

**Phase 2 — Ceremony Intelligence (2 models):**
- **Transcript** (`transcripts`): `id`, `fileName`, `ceremonyType`, `ceremonyDate`, `sprintId`, `workstreamId`, `rawContent`, `processedAt`, timestamps
- **CeremonyInsight** (`ceremony_insights`): `id`, `transcriptId`, `insightType`, `severity`, `content`, `relatedWorkstreamId`, `createdAt`

### ID Strategy

- CUID strings via `@default(cuid())`

## Component Architecture

- **Server Components** (default): Static rendering, direct DB access
- **Client Components** (`'use client'`): Interactive UI, browser APIs, React hooks
- **Layout wrapping**: `MantineProvider` at root layout level provides theme context

---

# Gap Analysis & Recommendations

## Resolved Issues

- ~~CI/CD package manager mismatch~~ — Removed GitHub Actions workflow (solo local project)
- ~~npm references in package.json scripts~~ — Fixed to use `pnpm run`
- ~~No `.env.example`~~ — Created with DATABASE_URL

## Remaining Issues

### 1. No Error Boundary or Global Error Handling (LOW)

**Problem**: No `error.tsx`, `not-found.tsx`, or `loading.tsx` files in the app directory.

**Fix**: Add Next.js error boundaries and loading states as features are built.

## Code Quality Gaps

### 6. Test Coverage (LOW — improved)

**Status**: Substantial test coverage now exists (89+ tests) covering sync logic, capacity sync, work items, iteration sync, and API routes. Some gaps may remain for edge cases or newer components.

### 7. Template Boilerplate Still Present (LOW)

**Problem**: The project still contains the Mantine template Welcome component and template metadata (`title: 'Mantine Next.js template'`).

**Note**: Legacy User/Post boilerplate has been removed (Story 6). Remaining template components will be replaced during feature development.

### 8. `reactStrictMode: false` (LOW)

**Problem**: React Strict Mode is disabled in `next.config.mjs`. This hides potential issues like impure renders, missing cleanup in effects, and deprecated API usage.

**Recommendation**: Enable unless there's a specific Mantine compatibility reason to keep it off.

## Potential Improvements

### 9. No API Validation Layer

API routes should include input validation. Consider adding Zod or similar schema validation for robustness as new API routes are built.

### 10. Storybook Coverage

Only the `Welcome` component has a story. Expand Storybook coverage as new components are built.
