# Story 2: ADO Work Item Schema

> **Status:** Completed ✅  
> **Priority:** High  
> **Dependencies:** Story 1 (Program Structure Schema)

## User Story

**As a** Scrum Master / Program Lead  
**I want to** have a WorkItem Prisma model that stores raw Azure DevOps work items with full support for ADO's hierarchy (Epic → Feature → User Story → Task + Bug/Spike/Support)  
**So that** I can calculate all sprint metrics (velocity, overhead%, predictability, carry-over) from raw work item data stored as-is, enabling accurate health reporting without pre-computed metric tables.

## Acceptance Criteria

- [x] **AC1:** Given a new WorkItem record, when I create it with adoId, type, state, and required fields, then it is stored in the `work_items` table with a CUID ID, timestamps, proper snake_case table mapping, and a unique constraint on `adoId` preventing duplicate ADO work items ✅
- [x] **AC2:** Given a WorkItem with WorkItemType enum, when I set the type field, then it accepts exactly these values: Epic, Feature, UserStory, Task, Bug, Spike, Support, and the enum is properly defined in Prisma schema ✅
- [x] **AC3:** Given a WorkItem with nullable foreign keys, when I create it with workstreamId and/or sprintId, then it correctly references Workstream and Sprint models (nullable), and when I query relationships, Prisma allows navigation from WorkItem → Workstream and WorkItem → Sprint ✅
- [x] **AC4:** Given a WorkItem with parentAdoId field, when I set it to reference another work item's adoId, then it stores the parent relationship as nullable Int, enabling ADO hierarchy queries (Epic → Feature → User Story → Task) without requiring a self-referential foreign key ✅
- [x] **AC5:** Given WorkItem records with various types and states, when I query for metric calculations, then indexes on `[workstreamId, sprintId]`, `type`, and `iterationPath` enable fast filtering for velocity, bug hours, spike hours, and support hours calculations ✅

## Implementation Tasks

- [x] **2.1** Write unit tests for WorkItem model creation, validation, and field constraints in `__tests__/prisma/work-item.test.ts`, including tests for all WorkItemType enum values, nullable foreign keys, parentAdoId field, and unique adoId constraint ✅
- [x] **2.2** Write integration tests for WorkItem relationships with Workstream and Sprint models, verifying nullable foreign key behavior and relationship navigation in `__tests__/prisma/work-item-relations.test.ts` ✅
- [x] **2.3** Write tests for WorkItem indexes, verifying unique constraint on adoId and composite index on [workstreamId, sprintId] in `__tests__/prisma/work-item-indexes.test.ts` ✅
- [x] **2.4** Define WorkItemType enum in `prisma/schema.prisma` with values: Epic, Feature, UserStory, Task, Bug, Spike, Support ✅
- [x] **2.5** Add WorkItem model to `prisma/schema.prisma` with all specified fields (adoId Int @unique, type WorkItemType, state String, storyPoints Float?, originalEstimate Float?, completedWork Float?, remainingWork Float?, areaPath String?, iterationPath String?, parentAdoId Int?, assignedTo String?, tags String?), CUID ID, timestamps, snake_case table mapping via `@@map("work_items")`, nullable foreign keys to Workstream and Sprint, and proper Prisma relations ✅
- [x] **2.6** Add indexes to WorkItem model: unique index on `adoId`, composite index on `[workstreamId, sprintId]`, index on `type`, and index on `iterationPath` using `@@index` directives ✅
- [x] **2.7** Create and run Prisma migration using `pnpm run db:migrate` to generate the database schema changes, ensuring Workstream and Sprint models exist first (Story 1 dependency) ✅
- [x] **2.8** Verify all acceptance criteria are met by running tests and manually validating schema structure, indexes, and relationships ✅
- [x] **2.9** Verify all tests pass and Prisma client generates correctly with `pnpm run db:generate` ✅

## Notes

### Technical Considerations

- **ADO ID Uniqueness:** The `adoId` field (Int) must have a unique constraint (`@unique`) to prevent duplicate work items from being synced multiple times. This is the primary lookup key for ADO sync operations.
- **WorkItemType Enum:** Must be defined before the WorkItem model in the schema file. Enum values match ADO work item types exactly: Epic, Feature, UserStory, Task, Bug, Spike, Support.
- **Parent Relationship:** The `parentAdoId` field stores the ADO ID of the parent work item (not a foreign key to another WorkItem record). This allows hierarchy queries without requiring a self-referential foreign key constraint, which simplifies sync logic and avoids circular dependency issues.
- **Nullable Foreign Keys:** Both `workstreamId` and `sprintId` are nullable (`String?`) because:
  - Work items may exist before workstream assignment
  - Work items may span multiple sprints or exist outside sprint iterations
  - ADO sync may encounter work items without clear workstream/sprint context
- **Index Strategy:** 
  - Unique index on `adoId` for fast ADO sync lookups
  - Composite index on `[workstreamId, sprintId]` for metric queries filtering by workstream and sprint
  - Index on `type` for filtering by work item type (e.g., Bug, Spike, Support for overhead calculations)
  - Index on `iterationPath` for ADO iteration path lookups
- **Field Types:** 
  - `storyPoints`, `originalEstimate`, `completedWork`, `remainingWork` are Float? (nullable) because not all work item types have these fields
  - `areaPath` and `iterationPath` are String? (nullable) to handle edge cases
  - `assignedTo` is String? (nullable) for unassigned work items
  - `tags` is String? (nullable) - consider if comma-separated string or JSON array is better; starting with String for simplicity
- **Table Naming:** Use `@@map("work_items")` to enforce PostgreSQL snake_case naming convention, consistent with existing schema.

### Potential Risks or Challenges

- **Migration Order:** WorkItem model depends on Workstream and Sprint models from Story 1. Ensure Story 1 migration is applied before Story 2 migration to satisfy foreign key constraints.
- **ADO ID Type:** Using `Int` for `adoId` assumes ADO work item IDs are integers. Verify this matches actual ADO ID format (should be Int64 in ADO API).
- **Parent Relationship Queries:** Since `parentAdoId` is not a foreign key, hierarchy queries require joining on `adoId = parentAdoId`, which may be less performant than a true foreign key. However, this avoids circular dependencies and sync complexity.
- **Tags Storage:** Storing tags as a single String field may limit queryability. Consider if comma-separated string is sufficient or if a separate WorkItemTag junction table is needed later. Starting simple with String field.
- **State Field:** The `state` field is a String (not an enum) because ADO states can vary by work item type and may include custom states. This provides flexibility but requires application-level validation.
- **Index Performance:** With expected scale (~4 workstreams × ~6 sprints × hundreds of work items), the composite index on `[workstreamId, sprintId]` should perform well. Monitor query performance if scale increases significantly.

### Integration Points

- **Story 1 (Program Structure):** WorkItem model references Workstream and Sprint via nullable foreign keys. Story 1 must be completed first.
- **Story 3 (Milestone):** Milestone model may reference WorkItem by adoId for ADP Commitment Features.
- **Story 4 (Sync Log):** SyncLog will track work item sync operations that populate WorkItem records.
- **Metric Calculations:** All Phase 1 metrics (velocity, overhead%, predictability, carry-over) depend on WorkItem data:
  - Velocity: `SUM(storyPoints) WHERE type IN (UserStory) AND state IN (Resolved, Closed) AND sprintId = X AND workstreamId = Y`
  - Bug Hours: `SUM(COALESCE(completedWork, originalEstimate)) WHERE type = Bug AND sprintId = X`
  - Spike Hours: `SUM(storyPoints * 1) WHERE type = Spike AND sprintId = X` (1 point = 1 hour)
  - Support Hours: `SUM(COALESCE(completedWork, originalEstimate)) WHERE type = Support AND sprintId = X`
- **ADO MCP Sync:** Future ADO sync operations will populate WorkItem records from ADO API responses, using `adoId` as the unique identifier.

## Definition of Done

- [x] All tasks completed (2.1 through 2.9) ✅
- [x] All acceptance criteria met (AC1 through AC5) ✅
- [x] Tests passing (94/94 via `pnpm run jest:prisma`) ✅
- [x] Prisma migration created and applied successfully (after Story 1 migration) ✅
- [x] Prisma client generated without errors ✅
- [x] All indexes verified in database schema ✅
- [x] WorkItemType enum properly defined and accessible in Prisma client ✅
- [x] Code reviewed (self-review of schema and tests) ✅
- [x] Documentation updated (schema comments, README if needed) ✅

---

**Related Files:**
- `prisma/schema.prisma` - Main schema file to modify
- `lib/prisma.ts` - Prisma client singleton (no changes needed)
- `__tests__/prisma/work-item.test.ts` - Unit tests for WorkItem model
- `__tests__/prisma/work-item-relations.test.ts` - Integration tests for relationships
- `__tests__/prisma/work-item-indexes.test.ts` - Tests for indexes and constraints
