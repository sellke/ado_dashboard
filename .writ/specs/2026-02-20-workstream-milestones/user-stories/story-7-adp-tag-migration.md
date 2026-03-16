# Story 7: ADP Tag Format Migration

> **Status:** Completed ✅ (2026-03-09)
> **Priority:** High
> **Dependencies:** Story 1 (modifies its code)
> **Phase:** Phase 2 — ADP Extension (Q4 FY26)

## User Story

**As a** dashboard system
**I want** the Feature Goal Sync to recognize only the strict `ADP-{MON}` tag format (e.g., `ADP-MAR`) and ignore all non-conforming tags
**So that** milestone tracking aligns with the Annual Development Plan tag convention and only intentionally tagged Features become milestones

## Acceptance Criteria

- [x] Given an ADO Feature with tag `ADP-MAR` in a workstream's area path, when the sync runs, then the Feature is upserted and a Milestone record is created with `targetMonth` = March 2026
- [x] Given an ADO Feature with tag `Feb-Goal` (legacy format), when the sync runs, then the Feature is synced as a WorkItem but NO Milestone record is created from it
- [x] Given an ADO Feature with tags `ADP-MAR; Q4; Sprint Planning`, when parsing, then only `ADP-MAR` is recognized as the monthly tag — `Q4` and other tags are not treated as monthly tags
- [x] Given an ADO Feature with tags `ADP February` or `ADP-MAR-2026` or `adp-m`, when parsing, then none of these match the strict `ADP-{MON}` format and no Milestone is created
- [x] Given the updated WIQL query, when building the query, then it uses `CONTAINS 'ADP-'` instead of `CONTAINS '-Goal'`
- [x] Given all 12 month abbreviations (JAN through DEC), when each is prefixed with `ADP-`, then all are correctly parsed to the corresponding month

## Implementation Tasks

- [x] 7.1 Write tests for `parseAdpTag()` — strict format: `ADP-MAR` → March, `ADP-FEB` → February; all 12 months; case insensitivity; year rollover
- [x] 7.2 Write rejection tests for `parseAdpTag()` — `Feb-Goal` → null, `ADP February` → null, `ADP-MAR-2026` → null, `adp-m` → null, empty string → null
- [x] 7.3 Write tests for updated `buildFeatureGoalWiql()` — verify `CONTAINS 'ADP-'` in the WHERE clause
- [x] 7.4 Replace `parseGoalTag()` with `parseAdpTag()` in `lib/sync/milestone-features.ts` — strict regex `/^ADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i`
- [x] 7.5 Update `buildFeatureGoalWiql()` to use `CONTAINS 'ADP-'` instead of `CONTAINS '-Goal'`
- [x] 7.6 Update `syncMilestoneFeatures()` to call `parseAdpTag()` and skip Features where it returns null
- [x] 7.7 Update all existing tests in `milestone-features.test.ts` that reference `-Goal` tags to use `ADP-{MON}` format

## Notes

- This is a **breaking change** for ADO data: Features must be retagged from `Feb-Goal` → `ADP-FEB` in ADO before the new sync will pick them up. Existing `Milestone` records from old tags remain but won't be refreshed.
- The strict regex is: `/^ADP-(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/i`
- Year rollover logic stays the same: if the month has passed, use next year
- The WIQL `CONTAINS 'ADP-'` is a broad filter — the strict parsing in code handles exact format validation post-fetch
- This story does NOT add `Qx` quarter parsing — that's Story 8

## Definition of Done

- [x] All tasks completed
- [x] All acceptance criteria met
- [x] Tests passing (46/46)
- [x] Code reviewed
- [x] No backward compatibility with `-Goal` format
