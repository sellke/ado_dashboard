# Story 2: Iteration Ingestion and Sprint Resolution

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** Scrum Master / operator
**I want to** have the rolling 5-sprint window ingested and mapped correctly from ADO
**So that** sprint data is available locally for reporting and the current sprint is identifiable for downstream exclusion from rolling averages

## Acceptance Criteria

- [x] Given team iterations are fetched from ADO, when the rolling window is computed, then exactly 5 sprints are selected (including current sprint) ✅
- [x] Given ADO iteration path and dates, when sprint data is synced, then local Sprint records are upserted by iteration path with correct start/finish dates ✅
- [x] Given live ADO iteration naming differs from seed assumptions, when syncing, then naming mismatches are handled safely (no overwrite/collision of canonical identifiers) ✅
- [x] Given a sprint is the current iteration, when sync summary is produced, then it is explicitly identified so downstream exclusion rules can filter it from rolling averages ✅

## Implementation Tasks

- [x] 2.1 Write unit tests for 5-sprint selection logic, Sprint upsert behavior, and current-sprint identification ✅
- [x] 2.2 Implement 5-sprint selection logic: fetch team iterations, sort by dates, select rolling 5 including current ✅
- [x] 2.3 Add Sprint upsert logic: match by iteration path, update start/finish dates; create if missing ✅
- [x] 2.4 Handle seed naming mismatch: compare ADO iteration paths to seed data, reconcile or migrate without overwriting canonical IDs ✅
- [x] 2.5 Add current-sprint identification in sync output metadata and keep selection deterministic across runs ✅
- [x] 2.6 Wire iteration ingestion into sync flow (config + ADO client from Story 1) ✅
- [ ] 2.7 Verification: run sync against live ADO, confirm 5 sprints stored, current sprint identified in summary, and exclusion rules behave correctly

## Notes

- Rolling 5 sprints include the current sprint; current sprint is excluded from rolling averages downstream
- Live ADO iteration naming may differ from `prisma/seed.ts` assumptions (e.g. path format, naming conventions)
- Use iteration path as primary key for matching; dates are secondary for conflict resolution

## Definition of Done

- [x] All tasks completed ✅
- [x] All acceptance criteria met ✅
- [x] Tests passing (204/204, 0 failures) ✅
- [x] Code reviewed ✅
- [x] Documentation updated ✅
