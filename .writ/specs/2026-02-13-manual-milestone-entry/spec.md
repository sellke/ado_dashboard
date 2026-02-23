# Manual Milestone Entry Specification

> Created: 2026-02-13
> Status: Planning
> Contract Locked: ✅

## Contract Summary

**Deliverable:** Add manual, feature-level monthly milestone management inside the existing `/dashboard` page, including create/edit/status tracking and grouped display for program use.

**Must Include:** Fast manual entry and clear progress visibility for monthly feature milestones by workstream.

**Hardest Constraint:** Keep implementation within S-sized scope (3-5 hours) while integrating cleanly into the existing dashboard architecture and Mantine UI patterns.

**Success Criteria:** Users can create/update milestones per workstream, track status progression (NotStarted/InProgress/Done), and review milestones grouped by workstream with target month context in one dashboard workflow.

**Scope Boundaries:**
- Included:
  - Milestone CRUD API routes for manual entry and updates
  - Dashboard section for milestone list + entry/edit interactions
  - Progress tracking via milestone status and simple completion summary
- Excluded:
  - Auto-calculated progress from linked ADO hierarchy
  - New schema fields (e.g., percent complete) in MVP
  - Dedicated standalone milestone page outside `/dashboard`

**⚠️ Technical Concerns:**
- Existing Milestone schema supports status-only progress; adding percentage progress now would create migration and UX overhead that conflicts with S-sized scope.
- Workstream lookup currently relies on non-unique names in seed logic; APIs should use IDs to avoid ambiguity.
- Dashboard data fetch currently centers on `/api/metrics`; adding milestone workflows must avoid regressions to existing metrics rendering states.

**💡 Recommendations:**
- Use status-only progress for MVP (`NotStarted`, `InProgress`, `Done`), then add richer progress in a later iteration if needed.
- Place a milestone panel on `/dashboard` (below current summary/cards) to preserve user flow.
- Start with manual ADO Feature ID text input (optional) instead of linked feature picker for faster delivery.

## Assumptions Locked With Contract

- User response `1. A` is interpreted as: milestone management belongs inside `/dashboard`.
- Remaining clarification responses were not provided through the questionnaire, so defaults are set to MVP-safe choices:
  - Progress model: status progression only
  - Display: grouped by workstream with target month visible/sortable
  - ADO feature link: optional manual numeric entry (`adoFeatureId`)
  - Scope priority: working CRUD + usable dashboard UI over advanced visualization

## Detailed Requirements

### Functional

1. Users can create milestones with:
   - `title` (required)
   - `workstreamId` (required)
   - `targetMonth` (required; month-level selection)
   - `status` (required; enum-backed)
   - `adoFeatureId` (optional number)
   - `notes` (optional text)
2. Users can edit existing milestone fields.
3. Users can change status quickly to reflect progress.
4. Users can delete an incorrectly entered milestone.
5. Dashboard shows milestones grouped by workstream and sorted by `targetMonth`.
6. Dashboard shows lightweight progress summary (counts by status and completion ratio).

### Non-Functional

- Use existing Mantine style/theme conventions.
- Reuse existing app route conventions (`app/api/.../route.ts`).
- Keep implementation testable with unit/integration tests aligned to current test structure.
- No degradation to existing dashboard metrics experience (loading, empty, error handling).

## API Requirements (MVP)

- `GET /api/milestones`
  - Optional query: `workstreamId`, `targetMonth`, `status`
  - Returns milestones with minimal joined workstream info (id, name)
- `POST /api/milestones`
  - Creates milestone with validation
- `PATCH /api/milestones/[id]`
  - Updates editable fields and status
- `DELETE /api/milestones/[id]`
  - Deletes milestone by ID

Validation includes:
- Required fields present
- Enum-safe `status`
- Valid date parsing for `targetMonth`
- Optional numeric parse for `adoFeatureId`

## UI Requirements (MVP)

- New dashboard section (`MilestonePanel`) under existing metric cards.
- Inputs for creation and edit flow (modal or inline form acceptable).
- Grouped display by workstream:
  - Workstream heading
  - Milestone rows/cards with title, month, status, optional feature ID, notes
- Simple progress indicators:
  - Counts by status
  - `% done = done / total * 100` (display-only calculation in UI from statuses)

## Story Plan

1. `story-1-milestone-api-and-validation`: Build and test milestone CRUD APIs with schema-aware validation.
   - Dependencies: None
2. `story-2-dashboard-milestone-panel-ui`: Add dashboard milestone panel with grouped display and create/edit/delete interactions.
   - Dependencies: Story 1
3. `story-3-progress-summary-and-state-coverage`: Add progress summary and complete UI/API state coverage tests + stories.
   - Dependencies: Story 1, Story 2

## Implementation Approach

1. Implement API routes first (MVP contract foundation).
2. Build client-side milestone panel that consumes milestone routes independently from metrics endpoint.
3. Add progress summary derived from status counts in returned milestone data.
4. Add tests:
   - API route tests for CRUD + validation failures
   - UI tests for grouped rendering, empty state, and status changes
5. Keep file organization aligned with existing dashboard/component and API route patterns.

# Manual Milestone Entry Specification

> Created: 2026-02-13
> Status: Planning
> Contract Locked: âœ…

## Contract Summary

**Deliverable:** CRUD API + Mantine UI for managing feature-level milestones with status progression, displayed as a new section within the existing `/dashboard` page grouped by workstream.

**Must Include:** Full create/edit/delete workflow for milestones with workstream assignment, target month, and NotStarted/InProgress/Done status tracking.

**Hardest Constraint:** Keeping scope tight (S-sized, 3-5 hours) â€” the Prisma model already exists, so this is purely API routes + UI.

**Success Criteria:** A user can create milestones, assign them to workstreams with target months, update status, and see them on the dashboard grouped by workstream.

**Scope Boundaries:**
- Included: CRUD API, milestone table grouped by workstream, create/edit form, dashboard integration
- Excluded: Auto-calculated progress from ADO work items (Phase 3), milestone burnup charts (Phase 2), percentage-complete field

## Detailed Requirements

### Existing Foundation

The `Milestone` Prisma model is already defined and migrated:

```prisma
model Milestone {
  id           String          @id @default(cuid())
  title        String
  adoFeatureId Int?
  workstreamId String
  targetMonth  DateTime
  status       MilestoneStatus @default(NotStarted)
  notes        String?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  workstream Workstream @relation(fields: [workstreamId], references: [id], onDelete: Cascade)

  @@index([workstreamId])
  @@map("milestones")
}

enum MilestoneStatus {
  NotStarted
  InProgress
  Done
}
```

Existing Prisma model tests:
- `__tests__/prisma/milestone.test.ts`
- `__tests__/prisma/milestone-status.test.ts`
- `__tests__/prisma/milestone-workstream.test.ts`

### API Requirements

**Endpoint:** `/api/milestones`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/milestones` | List all milestones (optional `?workstreamId=` filter) |
| POST | `/api/milestones` | Create a new milestone |
| PUT | `/api/milestones/[id]` | Update an existing milestone |
| DELETE | `/api/milestones/[id]` | Delete a milestone |

**Validation rules:**
- `title` â€” required, non-empty string
- `workstreamId` â€” required, must reference existing workstream
- `targetMonth` â€” required, valid ISO date string
- `status` â€” optional on create (defaults to NotStarted), must be valid MilestoneStatus
- `adoFeatureId` â€” optional integer (simple text field in UI, user types ADO Feature ID manually)
- `notes` â€” optional string

### UI Requirements

**Location:** New collapsible section on `/dashboard` page, below the workstream health cards.

**Milestone Table:**
- Grouped by workstream (each workstream shows its milestones)
- Columns: Title, Target Month, Status (badge), ADO Feature ID, Notes
- Status displayed as colored badge (NotStarted = gray, InProgress = blue, Done = green)
- Sortable by target month within each group

**Create/Edit Form:**
- Modal dialog (Mantine Modal)
- Fields: Title (text input), Workstream (select dropdown populated from DB), Target Month (month picker), Status (select), ADO Feature ID (optional number input), Notes (textarea)
- Validation: title required, workstream required, target month required

**Actions:**
- "Add Milestone" button opens create modal
- Click row or edit icon opens edit modal with pre-filled values
- Delete button with confirmation dialog
- Inline status toggle (click status badge to cycle: NotStarted -> InProgress -> Done)

### 4 Workstreams

| Name | ADO Area Path |
|------|--------------|
| Streams | Event Streaming Platform\App\LiveLink - Yellow Box\Streams |
| Pitch Tracker | Event Streaming Platform\App\LiveLink - Yellow Box\Pitch Tracker |
| Action Tracker | Event Streaming Platform\App\LiveLink - Yellow Box\Action Tracker |
| KPI Services + UCM | Event Streaming Platform\App\LiveLink - Yellow Box\Tier Boards |

## Implementation Approach

1. **API routes first** â€” Build CRUD endpoints with validation and tests
2. **Display component** â€” Read-only milestone table grouped by workstream
3. **Entry form** â€” Create/edit modal with Mantine form components
4. **Dashboard wiring** â€” Integrate milestone section into `/dashboard` page

### Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **ORM:** Prisma (model already exists)
- **UI:** Mantine v7 (consistent with existing dashboard)
- **Testing:** Jest + React Testing Library
- **Database:** PostgreSQL via Docker (localhost:5433)

## Non-Goals

- Milestone burnup charts (deferred to Phase 2)
- Auto-sync milestone progress from ADO Features (deferred to Phase 3)
- Percentage-complete tracking
- Drag-and-drop reordering
- Bulk import/export
- User authentication or role-based access
