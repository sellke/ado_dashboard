# Technical Specification — Manual Milestone Entry

> Parent Spec: `../spec.md`
> Created: 2026-02-13

## Objective

Implement an MVP manual milestone workflow on `/dashboard` with API-backed CRUD and status-based progress visibility, without changing the existing database schema.

## Existing Architecture Context

- Frontend dashboard composition:
  - `app/dashboard/page.tsx` renders `DashboardContainer`
  - `components/Dashboard/DashboardContainer.tsx` fetches `/api/metrics` and renders `DashboardShell`
- Backend metrics route exists at `app/api/metrics/route.ts`
- Prisma `Milestone` model already exists with `status` enum and `targetMonth` DateTime

## Implementation Strategy

1. Add milestone API routes independent from `/api/metrics`.
2. Extend dashboard container with milestone-specific fetching and mutations.
3. Add new milestone panel components that do not alter existing metric view model mapping.
4. Add progress summary computed in UI from milestone status distribution.

## Module Design

### API Layer

- `app/api/milestones/route.ts`
  - `GET`: list milestones with optional filters
  - `POST`: create milestone with validation
- `app/api/milestones/[id]/route.ts`
  - `PATCH`: partial update with validation
  - `DELETE`: remove milestone
- `lib/milestones/validation.ts`
  - parse/validate create & update payloads
  - enforce enum-safe status and valid date inputs

### UI Layer

- `components/Dashboard/MilestonePanel.tsx`
  - grouped milestone rendering by workstream
  - local create/edit/delete actions
  - empty/loading/error states
- `components/Dashboard/MilestoneStatusBadge.tsx`
  - status color mapping
- `components/Dashboard/MilestoneProgressSummary.tsx`
  - counts by status
  - completion percentage (`done / total * 100`)

### Container Integration

- Extend `DashboardContainer` to:
  - keep existing metrics fetch logic unchanged
  - add milestone state (`loading`, `error`, `data`)
  - provide callbacks for create/update/delete to milestone panel

## Data Flow

1. `/dashboard` loads -> metrics + milestones fetched independently.
2. Milestone panel renders grouped records from milestone API response.
3. CRUD action triggers mutation endpoint.
4. On success, panel refreshes milestone list and recomputes progress summary.

## Error Handling

- API:
  - `400` for validation failures
  - `404` when milestone ID or workstream cannot be resolved
  - `500` for unexpected failures
- UI:
  - milestone failures surface in panel only
  - dashboard metrics cards remain functional during milestone API failures

## Performance and Scope Guardrails

- Keep queries simple: sort by `targetMonth`, then `title`
- Use existing relation include (`workstream`) to avoid extra lookups in UI
- No pagination in MVP unless row counts prove problematic

## Testing Strategy

- API route tests:
  - `__tests__/app/api/milestones/route.test.ts`
  - `__tests__/app/api/milestones/[id]/route.test.ts`
- Dashboard component tests:
  - `__tests__/components/Dashboard/MilestonePanel.test.tsx`
  - `__tests__/components/Dashboard/MilestoneProgressSummary.test.tsx`
  - integration update in `__tests__/components/Dashboard/DashboardIntegration.test.tsx`
- Storybook:
  - `components/Dashboard/MilestonePanel.story.tsx`

## Traceability to User Stories

- Story 1: API routes + validation foundation
- Story 2: Milestone panel UX and dashboard integration
- Story 3: Progress summary and state coverage

# Manual Milestone Entry â€” Technical Specification

> Parent spec: `../spec.md`
> Created: 2026-02-13

## Architecture Overview

This feature adds a CRUD layer on top of the existing Prisma `Milestone` model and integrates a new UI section into the Mantine dashboard. No schema changes are needed.

### Component Architecture

```
app/dashboard/page.tsx
  â””â”€â”€ DashboardContainer.tsx (existing)
        â”œâ”€â”€ ProgramSummarySection (existing)
        â”œâ”€â”€ WorkstreamCardsGrid (existing)
        â””â”€â”€ MilestoneSection (NEW)
              â”œâ”€â”€ MilestoneTable (per workstream)
              â”‚     â””â”€â”€ MilestoneStatusBadge
              â””â”€â”€ MilestoneFormModal (create/edit)
```

### Data Flow

```
Browser                    Next.js API              Prisma/PostgreSQL
â”€â”€â”€â”€â”€â”€â”€                    â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€              â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
useMilestones() â”€â”€GETâ”€â”€â†’  /api/milestones  â”€â”€â†’     milestone.findMany()
                                                    (include: workstream)
                 â”€â”€POSTâ”€â†’ /api/milestones  â”€â”€â†’     milestone.create()
                 â”€â”€PUTâ”€â”€â†’ /api/milestones/[id] â”€â”€â†’ milestone.update()
                 â”€â”€DELETEâ†’ /api/milestones/[id] â”€â”€â†’ milestone.delete()
```

### New Files

| File | Purpose |
|------|---------|
| `app/api/milestones/route.ts` | GET (list) + POST (create) |
| `app/api/milestones/[id]/route.ts` | PUT (update) + DELETE |
| `lib/milestones/validation.ts` | Shared request validation |
| `lib/milestones/types.ts` | TypeScript types for milestone API |
| `lib/milestones/useMilestones.ts` | Client-side data fetching hook |
| `components/Dashboard/MilestoneSection.tsx` | Main section container |
| `components/Dashboard/MilestoneTable.tsx` | Per-workstream table |
| `components/Dashboard/MilestoneStatusBadge.tsx` | Status badge component |
| `components/Dashboard/MilestoneFormModal.tsx` | Create/edit form modal |

### Test Files

| File | Coverage |
|------|----------|
| `__tests__/app/api/milestones/route.test.ts` | GET + POST API tests |
| `__tests__/app/api/milestones/[id]/route.test.ts` | PUT + DELETE API tests |
| `__tests__/components/Dashboard/MilestoneSection.test.tsx` | Display component tests |
| `__tests__/components/Dashboard/MilestoneFormModal.test.tsx` | Form component tests |
| `__tests__/components/Dashboard/MilestoneIntegration.test.tsx` | Integration tests |

### Dependencies

No new packages needed. Uses existing:
- `@mantine/core` (Table, Modal, Badge, Button, TextInput, Select, Textarea, NumberInput, Paper, Accordion)
- `@mantine/form` (useForm)
- `@mantine/dates` (MonthPickerInput)
- `@mantine/notifications` (success/error feedback)
- `@prisma/client` (Milestone model)

### Patterns to Follow

- API routes: follow `app/api/metrics/route.ts` pattern
- Components: follow `components/Dashboard/WorkstreamHealthCard.tsx` pattern
- Tests: follow `__tests__/components/Dashboard/WorkstreamHealthCard.test.tsx` pattern
- Storybook: follow `components/Dashboard/WorkstreamHealthCard.story.tsx` pattern

### Error Handling

- API validation errors return 400 with `{ error: string, details?: Record<string, string> }`
- Not-found errors return 404 with `{ error: 'Milestone not found' }`
- Server errors return 500 with `{ error: 'Internal server error' }`
- Client-side: milestone section errors are isolated from rest of dashboard
