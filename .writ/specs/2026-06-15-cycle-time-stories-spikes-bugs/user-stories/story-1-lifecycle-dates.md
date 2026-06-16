# Story 1: Sync ADO Lifecycle Dates

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

As a dashboard user, I want synced work items to include the dates when work started and finished so that cycle-time metrics are based on real lifecycle events instead of generic created/changed timestamps.

## Acceptance Criteria

- Given ADO returns lifecycle date fields, when work items sync, then `UserStory`, `Spike`, and `Bug` records persist start and done timestamps.
- Given ADO omits one or both lifecycle dates, when work items sync, then the database stores `null` without failing the workstream sync.
- Given existing work item sync tests run, when lifecycle fields are present or absent, then mapper and persistence behavior is covered.
- Given schema migration runs, when existing rows lack lifecycle dates, then they remain valid with nullable fields.

## Implementation Tasks

- [x] Add nullable lifecycle timestamp fields to `WorkItem` in `prisma/schema.prisma`.
- [x] Create the Prisma migration for the new fields.
- [x] Extend `AdoWorkItemFields` and `MappedWorkItem` in `lib/sync/mappers.ts`.
- [x] Map preferred ADO lifecycle fields such as `Microsoft.VSTS.Common.ActivatedDate` and `Microsoft.VSTS.Common.ClosedDate`.
- [x] Persist mapped lifecycle dates in `lib/sync/work-items.ts`.
- [x] Add mapper and sync tests for present, missing, and malformed lifecycle date values.
- [x] Verify existing sync tests still pass.

## Technical Notes

- Do not use `System.CreatedDate` or `System.ChangedDate` as cycle-time fallbacks in v1.
- If field-level lifecycle dates are unavailable from the existing API call, document whether revision-history lookup is required for Story 3 or a follow-up.

## Definition of Done

- [x] Schema supports nullable lifecycle timestamps.
- [x] ADO mapper extracts lifecycle timestamps.
- [x] Work-item sync persists lifecycle timestamps without breaking missing-date cases.
- [x] Tests cover lifecycle-date mapping and persistence.

## Context for Agents

- See `spec.md` -> `## Detailed Requirements` -> `### Data Ingestion`.
- Relevant files: `prisma/schema.prisma`, `lib/sync/mappers.ts`, `lib/sync/work-items.ts`, `__tests__/lib/sync/work-items.test.ts`, `__tests__/prisma/work-item.test.ts`.
- Key invariant: missing lifecycle dates are data quality gaps, not sync failures.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

1. **`prisma/migrations/20260615201500_add_work_item_lifecycle_dates/migration.sql`**
   - Adds nullable `adoActivatedDate` and `adoClosedDate` columns to `work_items`.

### Files Modified

- **`prisma/schema.prisma`**
  - Added nullable ADO lifecycle timestamp fields to `WorkItem`.
- **`lib/sync/mappers.ts`**
  - Added preferred ADO lifecycle fields, mapped them through `MappedWorkItem`, and normalized missing or malformed date strings to `null`.
- **`lib/sync/work-items.ts`**
  - Requested lifecycle fields from ADO batch fetches and persisted mapped lifecycle dates, including a narrow same-revision backfill path for previously null lifecycle fields.
- **`__tests__/lib/sync/work-items.test.ts`**
  - Covered lifecycle mapping for User Story, Bug, and Spike; malformed/missing lifecycle values; ADO field request coverage; and persistence/backfill behavior.
- **`__tests__/prisma/work-item.test.ts`**
  - Covered nullable schema defaults and explicit lifecycle date persistence.

### Implementation Decisions

1. **Null over fallback dates** — Missing or malformed lifecycle dates are stored as `null`; created/changed timestamps are preserved for existing behavior but are not used as cycle-time fallbacks.
2. **Additive shared fetch fields** — `WORK_ITEM_FIELDS` now requests the two lifecycle fields for all shared work-item sync paths, including milestone feature sync, without changing type filtering.
3. **Revision-aware backfill** — Existing rows with the same ADO revision are still skipped unless incoming lifecycle dates can fill previously null lifecycle columns.

### Test Results

**Verification:** `pnpm run typecheck`; `pnpm jest __tests__/lib/sync/work-items.test.ts __tests__/prisma/work-item.test.ts --runInBand`
- ✅ TypeScript typecheck passed.
- ✅ Focused sync and Prisma suites passed: 84/84 tests.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 review iteration
- **Drift:** Low
- **Security:** Low risk
- **Boundary Compliance:** Story 1 changes stayed within schema, migration, sync mapper/upsert, and focused test boundaries.

### Deviations from Spec

None
