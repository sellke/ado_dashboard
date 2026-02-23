# Story 1: Program Structure Schema

> **Status:** Completed ✅  
> **Priority:** High  
> **Dependencies:** None

## User Story

**As a** Scrum Master / Program Lead  
**I want to** have foundational Prisma models for Workstream, Sprint, and SprintWorkstream that establish the core relational structure for the LiveLink Health Report  
**So that** I can track sprint capacity, planned vs completed points, and manual snapshot entries per workstream per sprint, enabling all future metric calculations and data relationships.

## Acceptance Criteria

- [x] ✅ **AC1:** Given a new Workstream record, when I create it with name and adoAreaPath, then it is stored in the `workstreams` table with a CUID ID, timestamps, and proper snake_case table mapping
- [x] ✅ **AC2:** Given a new Sprint record, when I create it with name, adoIterationPath, startDate, and endDate, then it is stored in the `sprints` table with a CUID ID, timestamps, and proper snake_case table mapping
- [x] ✅ **AC3:** Given a SprintWorkstream junction record, when I create it with sprintId and workstreamId, then it enforces a unique composite constraint on `[sprintId, workstreamId]` preventing duplicate entries
- [x] ✅ **AC4:** Given a SprintWorkstream record, when I update capacity fields (plannedPoints, completedPoints, grossHours, ptoHours, ceremonyHours, fteCount), then all nullable Float/Int fields accept null values and capacityLocked defaults to false
- [x] ✅ **AC5:** Given Workstream, Sprint, and SprintWorkstream models, when I query relationships, then Prisma relations allow me to navigate from Sprint → SprintWorkstream → Workstream and vice versa

## Implementation Tasks

- [x] **1.1** Write unit tests for Workstream model creation, validation, and field constraints in `__tests__/prisma/workstream.test.ts`
- [x] **1.2** Write unit tests for Sprint model creation, validation, date handling, and field constraints in `__tests__/prisma/sprint.test.ts`
- [x] **1.3** Write unit tests for SprintWorkstream model creation, unique composite constraint, nullable fields, and relationship navigation in `__tests__/prisma/sprint-workstream.test.ts`
- [x] **1.4** Add Workstream, Sprint, and SprintWorkstream models to `prisma/schema.prisma` with all specified fields, CUID IDs, snake_case table mappings via `@@map()`, and proper Prisma relations
- [x] ✅ **1.5** Create and run Prisma migration using `pnpm run db:migrate` to generate the database schema changes
- [x] ✅ **1.6** Verify all acceptance criteria are met by running tests and manually validating schema structure
- [x] ✅ **1.7** Verify all tests pass and Prisma client generates correctly with `pnpm run db:generate`

## Notes

### Technical Considerations

- **CUID IDs:** Use `@default(cuid())` for all three models, consistent with existing User/Post convention
- **Table Naming:** Use `@@map("workstreams")`, `@@map("sprints")`, `@@map("sprint_workstreams")` to enforce PostgreSQL snake_case naming
- **Relationships:** 
  - SprintWorkstream has `many-to-one` relations to both Sprint and Workstream
  - Sprint and Workstream have `one-to-many` relations to SprintWorkstream
  - Use `onDelete: Cascade` for SprintWorkstream when parent Sprint or Workstream is deleted
- **Unique Constraint:** Implement `@@unique([sprintId, workstreamId])` on SprintWorkstream to prevent duplicate capacity entries
- **Nullable Fields:** All capacity-related fields (plannedPoints, completedPoints, grossHours, ptoHours, ceremonyHours, fteCount, notes) should be optional (`?`) to allow partial data entry
- **Default Values:** `capacityLocked` defaults to `false` using `@default(false)`

### Potential Risks or Challenges

- **Migration Order:** Ensure Workstream and Sprint models are created before SprintWorkstream to satisfy foreign key constraints
- **Data Type Precision:** Float fields for points and hours may require precision considerations for financial calculations; PostgreSQL `REAL` or `DOUBLE PRECISION` should be sufficient
- **Date Handling:** Sprint startDate and endDate should use Prisma `DateTime` type; consider timezone implications if ADO dates are in different timezones
- **Relationship Integrity:** Foreign key constraints must be properly configured to prevent orphaned SprintWorkstream records

### Integration Points

- **Story 2 (WorkItem):** WorkItem model will reference both Workstream and Sprint via foreign keys
- **Story 3 (Milestone):** Milestone model will reference Workstream
- **Story 4 (Transcript):** Transcript model will reference Sprint and optionally Workstream
- **Seed Data:** Workstream seed data (4 workstreams) should be created in a separate seed task, but schema must support it

## Definition of Done

- [x] All tasks completed (1.1 through 1.7) ✅
- [x] All acceptance criteria met (AC1 through AC5) ✅
- [x] Tests passing (21/21 via `pnpm run jest:prisma`) ✅
- [x] Prisma migration created and applied successfully ✅
- [x] Prisma client generated without errors ✅
- [x] Code reviewed (self-review of schema and tests) ✅
- [x] Documentation updated (schema comments, README if needed) ✅

---

**Related Files:**
- `prisma/schema.prisma` - Main schema file to modify
- `lib/prisma.ts` - Prisma client singleton (no changes needed)
- `__tests__/prisma/` - Test directory for model tests
