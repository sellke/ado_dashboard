# Story 2: Filter Milestone Progress by ADP-MON Tag

**Status:** Completed ✅ (2026-03-24)  
**Priority:** High  
**Dependencies:** Story 1 (Complete ✅)  
**Spec:** `.writ/specs/2026-03-23-adp-milestones-panel/spec.md`

---

## User Story

**As a** program manager viewing the dashboard,  
**I want** the ADP Milestones panel to count only stories tagged with `ADP-MON` (e.g., `ADP-MAR`) in progress and breakdown,  
**So that** unrelated stories under a Q#-tagged Feature don't inflate or distort milestone completion percentages.

---

## Acceptance Criteria

### Given a Feature with mixed child stories (some ADP-MON-tagged, some untagged)
**When** the `/api/milestones` GET handler computes progress  
**Then** only the ADP-MON-tagged stories contribute to `totalPoints`, `completedPoints`, `percentComplete`, and `workstreamBreakdown`

### Given a Feature whose child stories are all untagged (no ADP-MON tag)
**When** the `/api/milestones` GET handler runs  
**Then** the feature's `workstreamBreakdown` is empty and it does not appear in the quarterly panel

### Given a child story with `tags: null`
**When** the filter is applied  
**Then** the story is excluded (same as untagged behavior)

### Given a child story tagged `ADP-MAR` (lowercase or mixed case)
**When** the filter is applied  
**Then** the story is included (case-insensitive match)

### Given all existing tests
**When** the filter is added  
**Then** all existing tests continue to pass with no regressions

---

## Implementation Tasks

- [x] **2.1** Add `hasAdpMonTag(tags: string | null): boolean` to `lib/milestones/format.ts` using the strict `ADP-(JAN|FEB|...|DEC)` regex (case-insensitive)
- [x] **2.2** Write unit tests for `hasAdpMonTag` in `__tests__/lib/milestones/` — covering null, valid tags (single/multi), invalid format (`ADP-SPRINT`), and case variants
- [x] **2.3** Add `tags: true` to the `workItem.findMany` select in `app/api/milestones/route.ts`
- [x] **2.4** Apply `hasAdpMonTag` filter — create `adpChildStories` immediately after fetch; use in both storiesByFeature loop and buildWorkstreamBreakdown; removed dead `children` variable
- [x] **2.5** Write integration tests in `__tests__/app/api/milestones/route.test.ts` — mixed tagged/untagged stories, all-untagged Feature, null tags, case-insensitive, breakdown-only filter
- [x] **2.6** Run full test suite and verify all existing tests pass

---

## Technical Notes

- Filter location: the `storiesByFeature` population loop in `route.ts` (lines ~92–106). A single `if (!hasAdpMonTag(story.tags)) continue;` guard covers both `computeMilestoneProgress` and `buildWorkstreamBreakdown` — no changes needed in either function.
- `hasAdpMonTag` should live in `lib/milestones/format.ts` (milestone domain). The same regex is used in `parseAdpTag` in `lib/sync/milestone-features.ts` — do not import from the sync module to avoid coupling.
- The `ChildStoryInput` type in `calculator.ts` does NOT need `tags` — filtering happens in the route handler before `ChildStoryInput` objects are constructed.
- `WorkItem.tags` is `String?` in the Prisma schema — semicolon-delimited per ADO convention. Example: `"ADP-MAR; Q4 PLAN; Sprint Planning"`.
- Case-insensitive match is required (`ADP-mar` and `ADP-MAR` are both valid).

---

## Definition of Done

- [x] `hasAdpMonTag` helper exists in `lib/milestones/format.ts` with tests
- [x] `app/api/milestones/route.ts` filters child stories to ADP-MON-tagged only
- [x] Route test covers mixed-tag, all-untagged, and null-tags scenarios
- [x] All tests pass (no regressions)
- [x] TypeScript compilation clean (`tsc --noEmit`)

---

## What Was Built

**Implemented:** 2026-03-24

**Files modified:** 4 (2 source, 2 test)
- `lib/milestones/format.ts` — added `hasAdpMonTag(tags: string | null): boolean` with `/^ADP-(JAN|...|DEC)$/i` regex; also added tests for pre-existing `formatTargetMonth`
- `app/api/milestones/route.ts` — added `tags: true` to `workItem.findMany` select; imported `hasAdpMonTag`; created `adpChildStories` (filtered from `childStories`); replaced both downstream usages (storiesByFeature loop and buildWorkstreamBreakdown closure); removed dead `children` variable
- `__tests__/lib/milestones/format.test.ts` — **new file** — 14 tests (11 for `hasAdpMonTag`, 3 for `formatTargetMonth`)
- `__tests__/app/api/milestones/route.test.ts` — added `tags: 'ADP-MAR'` to `mockChildStory` base; added `describe('ADP-MON tag filter', ...)` with 5 integration tests

**Key decisions:**
- Filtered `childStories` into `adpChildStories` **before** both downstream usages rather than in the `storiesByFeature` loop only. The story's Technical Notes were incorrect: `buildWorkstreamBreakdown` iterates the outer `childStories` closure directly (not `storiesByFeature`), so a single upstream filter was the correct DRY fix — flagged by Gate 0 architecture check.
- Added `s.tags ?? null` coercion at the call site to handle `undefined` gracefully (Prisma returns `null`, but the `??` guard makes intent explicit).

**Test results:** 101/101 tests passed, 5 suites. `lib/milestones/format.ts`: 100% coverage. `app/api/milestones/route.ts`: 97.22% coverage. TypeScript clean.
