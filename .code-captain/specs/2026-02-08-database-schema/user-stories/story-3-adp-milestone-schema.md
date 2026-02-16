# Story 3: ADP Milestone Schema

> **Status:** Completed ✅  
> **Priority:** High  
> **Dependencies:** Story 1 (Program Structure Schema)

## User Story

**As a** Scrum Master / Program Lead  
**I want to** have a Milestone Prisma model that represents ADP (Annual Development Plan) Commitments linked to ADO Features  
**So that** I can track milestone burnup per workstream against quarterly scope, monitor milestone status progression (NotStarted → InProgress → Done), and associate target completion months with each commitment for delivery planning.

## Acceptance Criteria

- [x] **AC1:** Given a new Milestone record, when I create it with title, workstreamId, targetMonth, and status, then it is stored in the `milestones` table with a CUID ID, timestamps, and proper snake_case table mapping ✅
- [x] **AC2:** Given a Milestone record, when I create it with an optional adoFeatureId, then the field accepts null values for manually created milestones and integer values for ADO Feature-linked milestones ✅
- [x] **AC3:** Given a Milestone record, when I set the status field, then it must be one of the MilestoneStatus enum values (NotStarted, InProgress, Done) and defaults appropriately ✅
- [x] **AC4:** Given a Milestone record, when I query milestones by workstreamId, then the database index on workstreamId enables efficient filtering and milestone burnup calculations per workstream ✅
- [x] **AC5:** Given Milestone and Workstream models, when I query relationships, then Prisma relations allow me to navigate from Milestone → Workstream and from Workstream → Milestone[] for milestone tracking per workstream ✅

## Implementation Tasks

- [x] **3.1** Write unit tests for MilestoneStatus enum definition and validation in `__tests__/prisma/milestone-status.test.ts` ✅
- [x] **3.2** Write unit tests for Milestone model creation, validation, nullable adoFeatureId, and field constraints in `__tests__/prisma/milestone.test.ts` ✅
- [x] **3.3** Write unit tests for Milestone-Workstream relationship navigation and foreign key constraints in `__tests__/prisma/milestone-workstream.test.ts` ✅
- [x] **3.4** Add MilestoneStatus enum definition to `prisma/schema.prisma` with values: NotStarted, InProgress, Done ✅
- [x] **3.5** Add Milestone model to `prisma/schema.prisma` with all specified fields (title, adoFeatureId, workstreamId, targetMonth, status, notes, createdAt, updatedAt), CUID ID, snake_case table mapping via `@@map("milestones")`, proper Prisma relation to Workstream, and index on workstreamId ✅
- [x] **3.6** Create and run Prisma migration using `pnpm run db:migrate` to generate the database schema changes ✅
- [x] **3.7** Verify all acceptance criteria are met by running tests and manually validating schema structure, enum values, and index creation ✅

## Notes

### Technical Considerations

- **CUID IDs:** Use `@default(cuid())` for Milestone model, consistent with existing User/Post convention
- **Table Naming:** Use `@@map("milestones")` to enforce PostgreSQL snake_case naming
- **Enum Definition:** Define MilestoneStatus enum before Milestone model in schema file:
  ```prisma
  enum MilestoneStatus {
    NotStarted
    InProgress
    Done
  }
  ```
- **Nullable adoFeatureId:** Use `Int?` type to allow null values for manually created milestones that aren't linked to ADO Features
- **Relationship:** 
  - Milestone has `many-to-one` relation to Workstream via `workstreamId`
  - Workstream has `one-to-many` relation to Milestone
  - Use `onDelete: Cascade` or `onDelete: Restrict` based on business rules (likely Restrict to prevent accidental milestone deletion when workstream is deleted)
- **Index:** Add `@@index([workstreamId])` to Milestone model for efficient milestone queries per workstream
- **DateTime for targetMonth:** Use Prisma `DateTime` type; consider storing only date portion (month/year) or full timestamp depending on precision needs for milestone tracking
- **Default Status:** Consider adding `@default(NotStarted)` to status field for new milestones

### Potential Risks or Challenges

- **Migration Order:** Ensure Workstream model exists before creating Milestone model to satisfy foreign key constraint (dependency on Story 1)
- **Enum Migration:** Prisma enum migrations require careful handling; ensure enum is created before Milestone model references it
- **Date Precision:** targetMonth as DateTime may store more precision than needed (day/time); consider if business logic requires only month/year granularity
- **ADO Feature Linking:** Nullable adoFeatureId allows flexibility but requires application logic to validate ADO Feature existence when linking; no database-level foreign key constraint to external ADO system
- **Status Transitions:** Application logic should enforce valid status transitions (e.g., NotStarted → InProgress → Done); enum alone doesn't enforce state machine rules
- **Index Performance:** Index on workstreamId is critical for milestone burnup queries; verify index is created correctly in migration

### Integration Points

- **Story 1 (Program Structure):** Milestone requires Workstream model to exist; foreign key dependency
- **Future Stories:** Milestone may be referenced by other models for reporting, analytics, or milestone completion tracking
- **ADO Integration:** adoFeatureId links to external ADO system; application layer must handle ADO Feature validation and synchronization
- **Reporting:** Milestone burnup tracking per workstream will query milestones filtered by workstreamId and aggregated by status and targetMonth

## Definition of Done

- [x] All tasks completed (3.1 through 3.7) ✅
- [x] All acceptance criteria met (AC1 through AC5) ✅
- [x] Tests passing (`pnpm test` or `pnpm jest`) ✅ — 181 tests, 0 failures
- [x] Prisma migration created and applied successfully ✅ — `20260211184942_add_milestone_model`
- [x] Prisma client generated without errors ✅
- [x] MilestoneStatus enum accessible in generated Prisma client ✅
- [x] Database index on workstreamId verified via migration or direct query ✅
- [x] Code reviewed (self-review of schema and tests) ✅ — Review agent passed
- [x] Documentation updated (schema comments, README if needed) ✅

---

**Related Files:**
- `prisma/schema.prisma` - Main schema file to modify (add MilestoneStatus enum and Milestone model)
- `lib/prisma.ts` - Prisma client singleton (no changes needed)
- `__tests__/prisma/` - Test directory for model tests
