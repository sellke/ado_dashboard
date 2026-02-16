# Code Style Guide

## File Organization

### Directory Structure

```
app/                    # Next.js App Router pages and API routes
  api/                  # REST API route handlers
  [feature]/            # Feature pages (e.g., users/)
  layout.tsx            # Root layout with MantineProvider
  page.tsx              # Home page
components/             # Reusable UI components (PascalCase directories)
  [ComponentName]/      # Each component in its own directory
    ComponentName.tsx          # Component implementation
    ComponentName.module.css   # Scoped CSS Module styles
    ComponentName.test.tsx     # Unit tests
    ComponentName.story.tsx    # Storybook story
lib/                    # Shared utility modules
  prisma.ts             # Prisma client singleton
prisma/                 # Database schema and migrations
  schema.prisma         # Prisma schema definition
  migrations/           # Migration files
  seed.ts               # Database seed script
test-utils/             # Custom testing utilities
  render.tsx            # Mantine-wrapped render helper
  index.ts              # Re-exports from RTL + custom render
docker/                 # Docker-related configuration
  postgres/init.sql     # Database initialization SQL
```

### Component Directory Pattern

Each component is isolated in its own PascalCase directory containing all related files:

```
ComponentName/
├── ComponentName.tsx           # Component code
├── ComponentName.module.css    # CSS Module (if styled)
├── ComponentName.test.tsx      # Tests
└── ComponentName.story.tsx     # Storybook story
```

## Naming Conventions

### Files

- **Components**: `PascalCase.tsx` (e.g., `ColorSchemeToggle.tsx`)
- **Pages**: `page.tsx` (Next.js App Router convention)
- **Layouts**: `layout.tsx`
- **API Routes**: `route.ts`
- **CSS Modules**: `ComponentName.module.css`
- **Tests**: `ComponentName.test.tsx`
- **Stories**: `ComponentName.story.tsx`
- **Config files**: `kebab-case` or conventional names (`.prettierrc.mjs`, `jest.config.cjs`)

### Variables and Functions

- **Functions/Components**: `PascalCase` for components, `camelCase` for utilities
- **Variables**: `camelCase`
- **Types/Interfaces**: `PascalCase` (e.g., `UserWithPosts`)
- **Database models**: `PascalCase` in Prisma schema, `snake_case` table names via `@@map()`

### Exports

- **Named exports** preferred over default exports for components
- **Default exports** used only for Next.js pages/layouts (required by framework)

## Code Patterns

### Client vs Server Components

- Server Components are the default (no directive needed)
- `'use client'` directive added only when browser APIs or hooks are needed
- Example: `ColorSchemeToggle.tsx` uses `'use client'` for `useMantineColorScheme()`
- Example: `Welcome.tsx` is a Server Component (no client directive)

### Mantine Component Usage

- **Named imports only** — no dot notation for sub-components (per cursor rule)
- Import directly from `@mantine/core`
- Theme customization via `createTheme()` in `theme.ts`

### Database Access

- Singleton Prisma client via `lib/prisma.ts`
- Global caching pattern to prevent multiple instances in development
- Import as: `import { prisma } from '@/lib/prisma'`
- Direct database access in Server Components and API routes

### API Route Pattern

```typescript
// app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
8. `@/` aliased imports
9. Relative imports (`../`, `./`)
10. CSS file imports

## Testing Patterns

### Test Structure

- Tests use `describe` / `it` blocks
- Custom `render()` from `@/test-utils` wraps components in MantineProvider
- Re-exports all of `@testing-library/react` plus custom render and `userEvent`

### Test File Pattern

```typescript
import { render, screen } from '@/test-utils';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  it('description of expected behavior', () => {
    render(<ComponentName />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

## Formatting Rules

- **Print width**: 100 characters
- **Quotes**: Single quotes
- **Trailing commas**: ES5 style
- **Semicolons**: Yes (default Prettier)
- **Indentation**: 2 spaces (default Prettier)
- **MDX files**: 70 character print width override
