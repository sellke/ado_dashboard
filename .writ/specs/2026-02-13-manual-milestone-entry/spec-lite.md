# Manual Milestone Entry Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-13
> Contract Locked: Yes

## Core Objective

Deliver manual monthly feature milestone management inside `/dashboard`, using existing Milestone schema and status progression for MVP progress tracking.

## Must-Haves

- Milestone CRUD API routes
- Dashboard milestone section (in-place workflow)
- Grouped display by workstream with target month visibility
- Progress summary from statuses (`NotStarted`, `InProgress`, `Done`)

## Locked Defaults / Assumptions

- Placement: `/dashboard` section (from user answer `1. A`)
- Progress model: status-only MVP
- ADO link: optional manual `adoFeatureId`
- Priority: working CRUD + usable UI within S-sized effort

## Non-Goals

- Auto progress from ADO hierarchy
- New schema fields (percent complete)
- Standalone milestones page

## Story Breakdown

1. Milestone API and validation
2. Dashboard milestone panel UI
3. Progress summary and state/test coverage

## Quality Gates

- CRUD and validation tests for milestone API routes
- Dashboard milestone section handles empty/error/loaded states
- Status transitions and grouped rendering validated by tests
- No regression to existing `/dashboard` metric rendering

# Manual Milestone Entry Specification (Lite)

> Source: `spec.md`
> Purpose: Compact AI context
> Created: 2026-02-13
> Contract Locked: Yes

## Core Objective

Build CRUD API routes and a Mantine UI section for managing feature-level milestones on the existing `/dashboard` page. The Prisma `Milestone` model already exists.

## Must-Have

- REST API: GET/POST/PUT/DELETE `/api/milestones`
- Milestone table grouped by workstream with status badges
- Create/edit modal form (title, workstream, target month, status, ADO feature ID, notes)
- Delete with confirmation
- Inline status cycling (NotStarted -> InProgress -> Done)
- Integrated as a new section below workstream cards on `/dashboard`

## Data Contract

- Prisma model: `Milestone` (already migrated)
- Fields: title, adoFeatureId?, workstreamId, targetMonth, status (MilestoneStatus enum), notes?
- Relation: Milestone -> Workstream (many-to-one)
- Workstreams fetched from DB for dropdown population

## Non-Goals

- Milestone burnup charts (Phase 2)
- ADO auto-sync of milestone progress (Phase 3)
- Percentage-complete field
- Auth / role-based access

## Story Breakdown

1. Milestone CRUD API routes with validation and tests
2. Milestone table display component (grouped by workstream)
3. Milestone create/edit form (modal)
4. Dashboard integration, state management, and test coverage

## Quality Gates

- API route tests for all CRUD operations and validation edge cases
- Component tests for table, form, empty state, loading state
- Storybook stories for milestone section
- Consistent with existing Mantine dashboard theme
