# Code Style Guide

> Last Updated: 2026-03-20

## File Organization

### Directory Structure

```
app/                        # Next.js App Router pages and API routes
  api/                      # REST API route handlers
    metrics/route.ts        # GET /api/metrics
    metrics/compute/route.ts # POST /api/metrics/compute
    milestones/route.ts     # GET /api/milestones
    milestones/[id]/route.ts # GET /api/milestones/:id
    sync/ado/route.ts       # POST /api/sync/ado
    sprints/stories/route.ts # GET /api/sprints/stories
  dashboard/                # Dashboard pages
    page.tsx                # Main dashboard
    streams/page.tsx        # Streams-only dashboard
    bugs/page.tsx           # Bug report page
  layout.tsx                # Root layout with MantineProvider
  page.tsx                  # Home page
components/                 # Reusable UI components
  Dashboard/                # All dashboard components (flat structure)
    DashboardContainer.tsx  # Client container — fetches data, manages state
    DashboardShell.tsx      # Loading/error/empty/success states
    WorkstreamHealthCard.tsx # Per-workstream card with metrics + charts
    ...                     # ~20 additional dashboard components
  Welcome/                  # Template component (PascalCase directory pattern)
    Welcome.tsx
    Welcome.test.tsx        # Co-located test (legacy pattern)
    Welcome.story.tsx
lib/                        # Shared business logic and utilities
  prisma.ts                 # Prisma client singleton
  ado/urls.ts               # ADO work item URL builder
  dashboard/                # Dashboard data layer
    adapter.ts              # API → DashboardViewModel mapping
    sprint-stories-adapter.ts # Sprint stories → view model mapping
    types.ts                # API response + view model type definitions
    sprint-utils.ts         # Sprint selection utilities
    config.ts               # Dashboard workstream filters (main vs streams)
  charts/                   # Chart library (Recharts wrappers)
    index.ts                # Public exports
    theme.ts                # Chart color tokens and Mantine integration
    types.ts                # Shared chart prop types
    ChartContainer.tsx      # Responsive container wrapper
    ChartTooltip.tsx        # Themed tooltip component
    ChartLegend.tsx         # Themed legend component
    LineChart.tsx            # AppLineChart wrapper
    BarChart.tsx             # AppBarChart wrapper
    AreaChart.tsx            # AppAreaChart wrapper
    *.story.tsx             # Storybook stories for each chart
  metrics/                  # Metric calculation engine
    calculators.ts          # Velocity, overhead, predictability calculators
    aggregator.ts           # Multi-workstream aggregation
    orchestrator.ts         # Compute → persist pipeline
    trend-service.ts        # Rolling averages, velocity rate, predictions
    snapshot.ts             # Snapshot persistence
    rolling.ts              # Rolling window calculations
    rag.ts                  # RAG threshold evaluation
    types.ts                # Metric type definitions
  milestones/               # Milestone logic
    calculator.ts           # Progress, burnup, program rollup
    types.ts, validation.ts, format.ts
  sprints/                  # Sprint utilities
    status-mapping.ts       # Work item status → display groups
  sync/                     # ADO sync layer
    orchestrator.ts         # Full sync coordination
    ado-client.ts           # ADO REST API client
    work-items.ts           # Work item sync
    iterations.ts           # Iteration sync
    capacity.ts             # Capacity sync
    milestone-features.ts   # Feature-to-milestone sync
    mappers.ts              # ADO → Prisma model mapping
    config.ts, types.ts
prisma/                     # Database schema and migrations
  schema.prisma             # 12 models, 7 enums
  seed.ts                   # Seeds workstreams, thresholds, sprints
  migrations/               # 11 migration files
__tests__/                  # Test suites (71 files)
  components/Dashboard/     # Dashboard component tests (28 files)
  lib/                      # Library unit tests (metrics, sync, dashboard, charts)
  app/api/                  # API route handler tests
  prisma/                   # Prisma model/relation tests (real DB)
  validation/               # Cross-cutting validation tests
test-utils/                 # Custom testing utilities
  render.tsx                # Mantine-wrapped render helper
  index.ts                  # Re-exports from RTL + custom render + userEvent
scripts/                    # CLI utility scripts
docker/                     # Docker configuration (postgres init)
docs/                       # API and database documentation
```

### Component Organization Patterns

**Dashboard components** — flat files in `components/Dashboard/`. No subdirectories; all co-located:

```
components/Dashboard/
├── DashboardContainer.tsx       # Client container (data fetching)
├── DashboardShell.tsx           # State machine (loading/error/success)
├── ProgramSummarySection.tsx    # Program-level metrics
├── WorkstreamCardsGrid.tsx      # Grid layout
├── WorkstreamHealthCard.tsx     # Per-workstream card
├── SprintTabSelector.tsx        # Shared sprint/tab selector
├── VelocityTrendChart.tsx       # Velocity line chart
├── BurnupChart.tsx              # Milestone burnup chart
├── OverheadBreakdownChart.tsx   # Overhead stacked bar chart
├── OverheadCompositionChart.tsx # Overhead area chart
├── MilestoneGoalsPanel.tsx      # Milestone progress panel
├── SprintStoryListPanel.tsx     # Tabbed story list
└── ...
```

**Tests** — centralized in `__tests__/` mirroring source structure (not co-located):

```
__tests__/
├── components/Dashboard/        # Mirrors components/Dashboard/
├── lib/dashboard/               # Mirrors lib/dashboard/
├── lib/charts/                  # Mirrors lib/charts/
├── lib/metrics/                 # Mirrors lib/metrics/
└── app/api/                     # Mirrors app/api/
```

## Naming Conventions

### Files

- **Components**: `PascalCase.tsx` (e.g., `WorkstreamHealthCard.tsx`)
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Layouts**: `layout.tsx`
- **API Routes**: `route.ts`
- **Lib modules**: `kebab-case.ts` (e.g., `trend-service.ts`, `status-mapping.ts`)
- **Tests**: `ComponentName.test.tsx` or `module-name.test.ts`
- **Stories**: `ComponentName.story.tsx`
- **Config files**: Conventional names (`.prettierrc.mjs`, `jest.config.cjs`, `eslint.config.mjs`)

### Variables and Functions

- **React Components**: `PascalCase` (e.g., `WorkstreamHealthCard`)
- **Utility functions**: `camelCase` (e.g., `computeVelocity`, `mapApiToViewModel`)
- **Variables**: `camelCase`
- **Constants**: `camelCase` for config objects, `UPPER_SNAKE_CASE` rare
- **Types/Interfaces**: `PascalCase` (e.g., `DashboardViewModel`, `MetricTileData`)
- **Database models**: `PascalCase` in Prisma schema, `snake_case` table names via `@@map()`

### Exports

- **Named exports** preferred over default exports for components and utilities
- **Default exports** used only for Next.js pages/layouts (required by framework)
- **Barrel exports** in `lib/charts/index.ts` for chart library public API

## Code Patterns

### Container / Presentational Split

Dashboard follows a strict container/presentational pattern:

```
DashboardContainer ('use client')
  ├── useState for metrics, milestones, stories, sync state
  ├── useEffect + useCallback for API fetching
  └── passes view models down to:
      DashboardShell (loading/error/empty/success)
        └── Presentational components (pure render from props)
```

### Adapter Pattern

API responses are never consumed directly by components. `lib/dashboard/adapter.ts` transforms raw API data into `DashboardViewModel`:

```typescript
// API response → adapter → view model → component
const apiData = await fetch('/api/metrics').then(r => r.json());
const viewModel = mapApiResponseToViewModel(apiData);
// viewModel contains formatted strings, RAG badges, grouped data
```

### Client vs Server Components

- **Server Components** are the default (no directive needed) for pages and layouts
- **`'use client'`** added for:
  - `DashboardContainer` — hooks, fetch, state
  - `WorkstreamHealthCard` — interactive tabs/expansion
  - `SprintTabSelector` — controlled tab state
  - Chart components — Recharts requires DOM
  - `SyncControl` — button interaction
- Pages like `app/dashboard/page.tsx` are thin server wrappers that render a client container

### Mantine Component Usage

- **Named imports only** from `@mantine/core` (no dot notation for sub-components)
- Theme customization via `createTheme()` in root `theme.ts`
- Components used extensively: `Card`, `Stack`, `Group`, `Tabs`, `Badge`, `Alert`, `Skeleton`, `Text`, `Title`, `Grid`, `Table`
- Dark mode supported via Mantine color scheme + chart theme tokens

### Database Access

- Singleton Prisma client via `lib/prisma.ts` with global caching for HMR
- Import as: `import { prisma } from '@/lib/prisma'`
- Used in API routes and server components only (never in client code)

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const data = await prisma.model.findMany({ /* ... */ });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error message:', error);
    return NextResponse.json({ error: 'User-facing message' }, { status: 500 });
  }
}
```

### Import Order (Enforced by Prettier)

1. CSS styles imports
2. `dayjs`
3. `react`
4. `next` / `next/*`
5. Built-in Node modules
6. Third-party modules
7. `@mantine/*` packages
8. `@/` aliased imports (project modules)
9. Relative imports (`../`, `./`)
10. CSS file imports

## Testing Patterns

### Framework and Utilities

- **Jest 30** with `ts-jest` and `jest-environment-jsdom`
- **React Testing Library** (`@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`)
- **Custom render**: `test-utils/render.tsx` wraps in `MantineProvider` with project theme
- **User events**: `@testing-library/user-event` re-exported from `test-utils/`

### Test Structure

```typescript
import { render, screen, within } from '@/test-utils';
import { ComponentName } from '@/components/Dashboard/ComponentName';

describe('ComponentName', () => {
  const defaultProps = { /* ... */ };

  it('renders expected content', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

### Mocking Strategies

- **Component tests**: `jest.mock()` for heavy dependencies (e.g., `@/lib/charts` → returns simple divs with `data-testid` and `data-*` attrs for assertions)
- **API route tests**: `jest.mock('@/lib/prisma')` and `jest.mock('@/lib/metrics/orchestrator')`
- **Prisma tests**: Real database (no mocks), `cleanupTestData()` in `afterEach`, `prisma.$disconnect()` in `afterAll`

### Fixture Factories

- Inline factory functions with `Partial<T>` override pattern: `makeBurnupPoint()`, `makeWsMetrics()`
- Shared factories in `__tests__/components/Dashboard/__fixtures__/dashboard-fixtures.ts`
- Builders: `createMetricTile()`, `createWorkstreamCard()`, `createDashboardViewModel()`, `createApiResponse()`

## Formatting Rules

- **Print width**: 100 characters
- **Quotes**: Single quotes
- **Trailing commas**: ES5 style
- **Semicolons**: Yes (default Prettier)
- **Indentation**: 2 spaces
- **MDX files**: 70 character print width override
