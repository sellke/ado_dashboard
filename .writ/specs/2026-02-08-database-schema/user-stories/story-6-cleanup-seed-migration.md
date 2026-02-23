# Story 6: Schema Cleanup, Seed Data & Migration

> **Status:** Completed ✅  
> **Priority:** High  
> **Dependencies:** Stories 1–5 (all models must be defined first)

## User Story

**As a** Scrum Master / Program Lead  
**I want to** remove boilerplate User/Post models, create the complete Prisma migration, write a comprehensive seed script with default data, and validate the full schema works end-to-end  
**So that** I have a clean, production-ready database schema with default workstreams, health metric thresholds, and optional historical sprint data, enabling immediate use of the LiveLink Health Report system without manual data entry.

## Acceptance Criteria

- [x] **AC1:** Given the Prisma schema, when I remove User and Post models, then all references to these models are removed from the codebase (app/users/, app/api/users/, prisma/seed.ts) and the schema file contains only the LiveLink Health Report models ✅
- [x] **AC2:** Given the seed script, when I run `pnpm run db:seed`, then it creates 4 workstreams with correct ADO area paths (Streams, Pitch Tracker, Action Tracker, KPI Services + UCM) and all records are persisted in the database ✅
- [x] **AC3:** Given the seed script, when I run `pnpm run db:seed`, then it creates ThresholdConfig records with default RAG thresholds for all 5 health metrics (sprintPredictability, carryOverRate, overheadPercent, agingWipDays, scopeCreepIndex) matching the specified ranges ✅
- [x] **AC4:** Given the seed script with optional sprint data, when I run `pnpm run db:seed`, then it creates 5 historical sprints plus current Sprint 1 Q4 FY26 (6 total sprints) with proper date ranges and ADO iteration paths ✅
- [x] **AC5:** Given the complete migration, when I run `pnpm run db:generate` and `pnpm run db:migrate`, then all models from Stories 1–5 are created in the database, Prisma client generates without errors, and the seed script executes successfully without foreign key violations ✅

## Implementation Tasks

- [x] **6.1** Write unit tests for seed script execution, verifying workstream creation, ThresholdConfig defaults, and optional sprint data in `__tests__/prisma/seed.test.ts` ✅
- [x] **6.2** Remove User model from `prisma/schema.prisma` and verify no remaining references to User in schema relations ✅
- [x] **6.3** Remove Post model from `prisma/schema.prisma` and verify no remaining references to Post in schema relations ✅
- [x] **6.4** Delete `app/users/page.tsx` file that displays User/Post data ✅
- [x] **6.5** Delete `app/api/users/route.ts` file that provides User CRUD API endpoints ✅
- [x] **6.6** Rewrite `prisma/seed.ts` to create 4 workstreams with specified ADO area paths (Streams, Pitch Tracker, Action Tracker, KPI Services + UCM) ✅
- [x] **6.7** Add ThresholdConfig seed data to `prisma/seed.ts` with default RAG thresholds for all 5 health metrics ✅
- [x] **6.8** Add optional sprint seed data to `prisma/seed.ts` creating 5 historical sprints plus current Sprint 1 Q4 FY26 with proper date ranges and ADO iteration paths ✅
- [x] **6.9** Create and run Prisma migration using `pnpm run db:migrate` to remove User/Post tables and create all models from Stories 1–5 ✅
- [x] **6.10** Verify Prisma client generates correctly with `pnpm run db:generate` and all model types are accessible ✅
- [x] **6.11** Run seed script with `pnpm run db:seed` and verify all data is created successfully without errors ✅
- [x] **6.12** Validate end-to-end schema functionality by querying seeded data through Prisma client and verifying relationships work correctly ✅

## Notes

### Technical Considerations

- **Boilerplate Removal:**
  - User model (`users` table) must be removed from schema.prisma
  - Post model (`posts` table) must be removed from schema.prisma
  - `app/users/page.tsx` is a Next.js page component that queries User/Post data - delete entire file
  - `app/api/users/route.ts` provides GET/POST endpoints for User CRUD - delete entire file
  - `prisma/seed.ts` currently seeds User/Post test data - rewrite completely
  - Check `lib/prisma.ts` for any User/Post type imports (should be fine, but verify)
  - Update README.md and architecture docs if they reference User/Post models

- **Migration Order:**
  - Prisma migration will drop `users` and `posts` tables (cascade delete will handle foreign keys)
  - Migration will create all new tables from Stories 1–5 in dependency order
  - Ensure all foreign key relationships are satisfied (Workstream/Sprint created before SprintWorkstream, etc.)
  - Migration should be idempotent - running twice should not cause errors

- **Seed Data Structure:**
  - **Workstreams (4 records):**
    - Streams: `name: "Streams"`, `adoAreaPath: "Event Streaming Platform\App\LiveLink - Yellow Box\Streams"`
    - Pitch Tracker: `name: "Pitch Tracker"`, `adoAreaPath: "Event Streaming Platform\App\LiveLink - Yellow Box\Pitch Tracker"`
    - Action Tracker: `name: "Action Tracker"`, `adoAreaPath: "Event Streaming Platform\App\LiveLink - Yellow Box\Action Tracker"`
    - KPI Services + UCM: `name: "KPI Services + UCM"`, `adoAreaPath: "Event Streaming Platform\App\LiveLink - Yellow Box\Tier Boards"`
  
  - **ThresholdConfig (defaults for all 5 metrics):**
    - `sprintPredictability`: Green 80-100, Amber 60-79.99, Red 0-59.99
    - `carryOverRate`: Green 0-10, Amber 10.01-25, Red 25.01-100
    - `overheadPercent`: Green 0-30, Amber 30.01-45, Red 45.01-100
    - `agingWipDays`: Green 0-5, Amber 5.01-10, Red 10.01-999
    - `scopeCreepIndex`: Green 0-10, Amber 10.01-20, Red 20.01-100
  
  - **Sprints (optional, 6 total):**
    - 5 historical sprints with appropriate date ranges and ADO iteration paths
    - Current Sprint 1 Q4 FY26 with start/end dates and ADO iteration path
    - Sprint names and dates should be realistic (e.g., Sprint 1 Q4 FY26 might be Oct 1, 2025 - Oct 14, 2025)

- **Seed Script Best Practices:**
  - Use `upsert` operations to make seed script idempotent (can run multiple times safely)
  - Use `createMany` for bulk inserts where possible for performance
  - Handle errors gracefully with try/catch and meaningful error messages
  - Log progress (e.g., "Created 4 workstreams", "Created ThresholdConfig defaults")
  - Use transactions if creating related data to ensure atomicity

- **Database Commands:**
  - `pnpm run db:generate` - Generate Prisma client after schema changes
  - `pnpm run db:migrate` - Create and apply migration (or `pnpm run db:migrate dev` for development)
  - `pnpm run db:seed` - Run seed script to populate default data
  - `pnpm run db:reset` - Reset database (drops all tables, runs migrations, runs seed) - useful for testing

### Potential Risks or Challenges

- **Data Loss Risk:** Removing User/Post models will drop existing tables and all data. If there's any production data, this must be migrated or backed up first. For development, this is acceptable.
- **Migration Conflicts:** If migrations from Stories 1–5 were already applied, the final migration may need to consolidate changes or handle existing tables. Consider using `prisma migrate reset` in development to start fresh.
- **Foreign Key Dependencies:** Seed script must create Workstreams before SprintWorkstream records, Sprints before SprintWorkstream records, etc. Order matters.
- **ADO Path Formatting:** ADO area paths contain backslashes - ensure they're properly escaped in seed script (use single quotes or escape sequences).
- **Date Handling:** Sprint dates must be valid DateTime values. Ensure date ranges don't overlap incorrectly and current sprint dates are in the future relative to historical sprints.
- **Threshold Ranges:** Verify threshold ranges don't have gaps or overlaps (e.g., Green 0-10, Amber 10.01-25 means 10.01 is the boundary - ensure this is intentional).
- **Seed Script Idempotency:** If seed script runs multiple times, it should not create duplicate records. Use `upsert` with unique constraints or check for existing records before creating.
- **TypeScript Errors:** After removing User/Post models, TypeScript may show errors in files that import these types. Ensure all references are removed before running typecheck.

### Integration Points

- **Stories 1–5:** All models from previous stories must be defined and tested before this cleanup/migration story
- **Future Features:** Seed data provides foundation for all future features - workstreams are referenced throughout the application
- **Health Metrics:** ThresholdConfig defaults enable immediate use of health metric calculations without manual configuration
- **Sprint Tracking:** Historical sprint data (if seeded) provides context for trend analysis and sprint-over-sprint comparisons
- **ADO Integration:** Workstream ADO area paths must match actual ADO project structure for future sync operations

## Definition of Done

- [x] All tasks completed (6.1 through 6.12) ✅
- [x] All acceptance criteria met (AC1 through AC5) ✅
- [x] User and Post models removed from schema.prisma ✅
- [x] app/users/page.tsx deleted ✅
- [x] app/api/users/route.ts deleted ✅
- [x] Seed script rewritten with workstreams, ThresholdConfig defaults, and optional sprints ✅
- [x] Prisma migration created and applied successfully (`pnpm run db:migrate`) ✅
- [x] Prisma client generated without errors (`pnpm run db:generate`) ✅
- [x] Seed script executes successfully (`pnpm run db:seed`) ✅
- [x] All seeded data verified in database (4 workstreams, 5 ThresholdConfig records, optional 6 sprints) ✅
- [x] No TypeScript errors related to removed User/Post models ✅
- [x] Tests passing (`pnpm test` or `pnpm jest`) ✅
- [x] Code reviewed (self-review of schema, seed script, and removed files) ✅
- [x] Documentation updated (README.md, docs/DATABASE_SETUP.md) ✅

---

**Related Files:**
- `prisma/schema.prisma` - Remove User/Post models, ensure all Stories 1–5 models are present
- `prisma/seed.ts` - Rewrite completely with LiveLink Health Report seed data
- `prisma/migrations/` - New migration will be created for User/Post removal and final schema
- `app/users/page.tsx` - **DELETE** this file
- `app/api/users/route.ts` - **DELETE** this file
- `lib/prisma.ts` - Verify no User/Post imports (should be fine)
- `README.md` - Update database models section if it references User/Post
- `.writ/docs/architecture.md` - Update database schema section if it references User/Post
