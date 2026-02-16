# Story 4: Configuration & Sync Infrastructure

> **Status:** Completed ✅  
> **Priority:** Medium  
> **Dependencies:** None

## User Story

**As a** Scrum Master / Program Lead  
**I want to** have two independent Prisma models (ThresholdConfig for configurable RAG thresholds and SyncLog for ADO sync audit trail)  
**So that** I can configure metric threshold boundaries (green/amber/red ranges) per metric and track every ADO data synchronization with timestamps, status, item counts, and error details for audit and debugging purposes.

## Acceptance Criteria

- [x] **AC1:** Given a new ThresholdConfig record, when I create it with metricName, greenMin/Max, amberMin/Max, and optional redMin/Max, then it is stored in the `threshold_configs` table with a CUID ID, unique metricName constraint, timestamps, and proper snake_case table mapping ✅
- [x] **AC2:** Given a ThresholdConfig record for "sprintPredictability", when I query it, then it contains default seeded values (Green: 85-100%, Amber: 70-85%, Red: 0-70%) as specified in the technical spec ✅
- [x] **AC3:** Given a new SyncLog record, when I create it with syncType (enum: WorkItems, Iterations, Capacity, Full), status (enum: Running, Success, Failed), and optional item counts/errorMessage, then it is stored in the `sync_logs` table with a CUID ID, timestamps, and proper snake_case table mapping ✅
- [x] **AC4:** Given SyncLog records, when I query recent syncs by startedAt, then the index on `startedAt` enables efficient lookups for recent synchronization history ✅
- [x] **AC5:** Given ThresholdConfig and SyncLog models, when I query them independently, then they function without dependencies on Workstream, Sprint, or other core program structure models ✅

## Implementation Tasks

- [x] **4.1** Write unit tests for ThresholdConfig model creation, validation, unique metricName constraint, and field constraints in `__tests__/prisma/threshold-config.test.ts` ✅
- [x] **4.2** Write unit tests for SyncLog model creation, enum validation (SyncType, SyncStatus), nullable fields, and index verification in `__tests__/prisma/sync-log.test.ts` ✅
- [x] **4.3** Define SyncType and SyncStatus enums in `prisma/schema.prisma` with values (WorkItems, Iterations, Capacity, Full) and (Running, Success, Failed) respectively ✅
- [x] **4.4** Add ThresholdConfig model to `prisma/schema.prisma` with metricName (String, @unique), greenMin/Max (Float), amberMin/Max (Float), redMin/Max (Float?), timestamps, and `@@map("threshold_configs")` ✅
- [x] **4.5** Add SyncLog model to `prisma/schema.prisma` with syncType (SyncType enum), status (SyncStatus enum), itemsFetched/Created/Updated (Int?), errorMessage (String?), startedAt/completedAt/createdAt (DateTime), `@@index([startedAt])`, and `@@map("sync_logs")` ✅
- [x] **4.6** Create seed script to insert default threshold configurations (5 metrics: sprintPredictability, velocityTrend, capacityUtilization, workItemAge, blockerCount) ✅
- [x] **4.7** Create and run Prisma migration using `pnpm run db:migrate` to generate the database schema changes ✅
- [x] **4.8** Verify all acceptance criteria are met by running tests and manually validating schema structure, enum values, and index creation ✅
- [x] **4.9** Verify all tests pass and Prisma client generates correctly with `pnpm run db:generate` ✅

## Notes

### Technical Considerations

- **CUID IDs:** Use `@default(cuid())` for both models, consistent with existing User/Post convention
- **Table Naming:** Use `@@map("threshold_configs")` and `@@map("sync_logs")` to enforce PostgreSQL snake_case naming
- **Unique Constraint:** Implement `@unique` on ThresholdConfig.metricName to prevent duplicate metric configurations
- **Enum Definitions:** 
  - SyncType enum: `WorkItems | Iterations | Capacity | Full`
  - SyncStatus enum: `Running | Success | Failed`
  - Enums should be defined at schema level before model usage
- **Nullable Fields:** 
  - ThresholdConfig: redMin and redMax are optional (`Float?`) to allow metrics that don't need red thresholds
  - SyncLog: itemsFetched, itemsCreated, itemsUpdated, errorMessage, and completedAt are optional to support partial data during running syncs
- **Index on startedAt:** Use `@@index([startedAt])` on SyncLog for efficient queries of recent sync history
- **Default Values:** 
  - SyncLog.startedAt uses `@default(now())` to auto-populate on creation
  - SyncLog.createdAt uses `@default(now())` for audit trail
- **Independence:** These models are intentionally independent and do not reference Workstream, Sprint, WorkItem, or other core program models

### Potential Risks or Challenges

- **Enum Migration:** Prisma enum migrations require careful handling; ensure enum values are defined before first migration
- **Threshold Validation:** Application logic should validate that greenMin < greenMax, amberMin < amberMax, etc., but schema-level constraints may be limited
- **SyncLog Growth:** SyncLog table may grow large over time; consider periodic archival strategy or retention policies (not part of this story)
- **Timezone Handling:** DateTime fields should use Prisma DateTime type; consider UTC storage for consistency across timezones
- **Red Threshold Optionality:** Some metrics may not need red thresholds; ensure application logic handles missing redMin/redMax gracefully
- **Index Performance:** The index on startedAt should be sufficient for recent sync queries, but very large tables may need composite indexes for complex queries

### Integration Points

- **Future Stories:** ThresholdConfig will be referenced by metric calculation logic to determine RAG status (green/amber/red)
- **ADO Sync Service:** SyncLog will be populated by ADO synchronization services to track sync operations
- **Seed Data:** Default Sprint Predictability thresholds should be seeded during initial database setup
- **No Dependencies:** These models are intentionally independent and can be created without dependencies on other stories

## Definition of Done

- [x] All tasks completed (4.1 through 4.9) ✅
- [x] All acceptance criteria met (AC1 through AC5) ✅
- [x] Tests passing (`pnpm test` or `pnpm jest`) ✅
- [x] Prisma migration created and applied successfully ✅
- [x] Prisma client generated without errors ✅
- [x] Enums (SyncType, SyncStatus) properly defined and accessible in generated Prisma client ✅
- [x] Index on SyncLog.startedAt verified in database schema ✅
- [x] Default Sprint Predictability threshold seeded in database ✅
- [x] Code reviewed (self-review of schema and tests) ✅
- [x] Documentation updated (schema comments, README if needed) ✅

---

**Related Files:**
- `prisma/schema.prisma` - Main schema file (modified — added SyncType, SyncStatus enums + ThresholdConfig, SyncLog models)
- `lib/prisma.ts` - Prisma client singleton (no changes needed)
- `__tests__/prisma/threshold-config.test.ts` - ThresholdConfig model tests (13 tests)
- `__tests__/prisma/sync-log.test.ts` - SyncLog model tests (16 tests)
- `__tests__/prisma/helpers.ts` - Test helpers (updated with cleanup for new models)
- `prisma/seed.ts` - Seed script (updated with 5 threshold configurations)
- `prisma/migrations/20260209025207_add_config_and_sync_models/migration.sql` - Migration file
