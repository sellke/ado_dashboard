# Story 3: Accurate as-of bug burndown

> Status: Completed ✅
> Priority: Medium
> Dependencies: Story 1

## User Story

As an engineering manager viewing a previous sprint tab, I want the bug burndown to reflect the bugs that were actually open as of each sprint in the window, so that the historical burndown is accurate instead of reconstructed backward from today's open-bug count.

## Acceptance Criteria

1. **Given** a sprint S in the window, **When** the burndown computes active bugs, **Then** `activeBugs(S) = bugs where createdDate <= S.endDate AND (state in BUG_OPEN_STATES OR (state in BUG_RESOLVED_STATES AND changedDate > S.endDate))`.
2. **Given** a bug resolved within sprint S's window, **When** `bugsClosed(S)` is computed, **Then** the existing definition is unchanged (resolved with `changedDate` within the sprint window).
3. **Given** a bug with a null `createdDate`, **When** active bugs are computed, **Then** the bug is included (treated as "include") to avoid undercounting.
4. **Given** the burndown bug queries in `app/api/metrics/route.ts`, **When** bug inputs are selected, **Then** `adoCreatedDate` is selected and passed through as `createdDate` on `BurndownBugInput`.
5. **Given** the new as-of computation, **When** a previous sprint tab is rendered, **Then** the burndown no longer depends on backward reconstruction from TODAY's open-bug count.

## Implementation Tasks

- [x] Write/extend `computeBugBurndown` tests for the as-of formula: open-state inclusion, resolved-but-changed-after-endDate inclusion, resolved-before-endDate exclusion, and null `createdDate` inclusion.
- [x] Add `createdDate` (nullable) to the `BurndownBugInput` type.
- [x] Replace the backward reconstruction in `computeBugBurndown` with the direct as-of computation per sprint S using the formula in AC #1.
- [x] Keep `bugsClosed(S)` unchanged (resolved with `changedDate` within the sprint window).
- [x] Update the burndown bug queries in `app/api/metrics/route.ts` to select `adoCreatedDate` and pass it as `createdDate`.
- [x] Document the single-`changedDate` approximation (only the latest state change is known, so resolve/reopen churn within a sprint is approximated) in code and/or the technical spec.
- [x] Run the test suite + typecheck and confirm all pass.

## Technical Notes

- `computeBugBurndown` currently uses backward reconstruction: it starts `runningOpen = currentOpen` (bugs currently in open states) and walks backward adding `bugsClosed`. Replace this with the direct per-sprint as-of computation.
- As-of open formula per sprint S: `activeBugs(S) = bugs where createdDate <= S.endDate AND (state in BUG_OPEN_STATES OR (state in BUG_RESOLVED_STATES AND changedDate > S.endDate))`.
- `BUG_OPEN_STATES = ['New', 'Active']`; `BUG_RESOLVED_STATES = ['Resolved', 'Testing', 'Closed']`.
- Inputs today are `{ state, changedDate }`; add `createdDate` to `BurndownBugInput`. `WorkItem` also has `adoCreatedDate` (selectable).
- `app/api/metrics/route.ts`: update the burndown bug queries to `select` `adoCreatedDate` and pass it through as `createdDate`.
- Null `createdDate` → treat as "include" (do not exclude) to avoid undercount.
- Single-`changedDate` approximation: only the latest `changedDate`/`state` is available, so a bug that was resolved and reopened, or resolved after S but changed again later, is approximated by its latest known state and `changedDate`. Document this limitation.
- Depends on Story 1: the sprint-anchored window must exist so each sprint S in the window has the correct `endDate` to compute against.

## Definition of Done

- [x] `computeBugBurndown` uses the direct as-of formula; backward reconstruction removed.
- [x] `BurndownBugInput` includes `createdDate`; `app/api/metrics/route.ts` selects and passes `adoCreatedDate`.
- [x] `bugsClosed(S)` behavior unchanged.
- [x] Null `createdDate` is included; single-`changedDate` approximation documented.
- [x] Tests + typecheck pass.

## Context for Agents

- Spec: ../spec.md
- Technical spec: ../sub-specs/technical-spec.md  (see Story 1 / Story 3 sections, Error & Rescue Map, Shadow Paths)
- Key business rules: window = startDate <= selected.startDate desc take 5; forecast only when selected == live current sprint; as-of open formula above.

---

## What Was Built

**Implementation Date:** 2026-06-04

### Files Created

[None created]

### Files Modified

- **`lib/metrics/trend-service.ts`**
  - Added nullable `createdDate` to burndown inputs and replaced backward reconstruction with direct as-of active bug computation per sprint end.
- **`app/api/metrics/route.ts`**
  - Selected `adoCreatedDate` for shared burndown bugs and passed it through to workstream and program burndown calculations.
- **`__tests__/lib/metrics/trend-service.test.ts`**
  - Added as-of coverage for created-after exclusion, resolved-after inclusion, resolved-before exclusion, and null-created inclusion.
- **`__tests__/app/api/metrics/route.test.ts`**
  - Asserted `adoCreatedDate` selection and updated stale burndown comments.

### Implementation Decisions

1. **Direct per-sprint computation** — `computeBugBurndown` now evaluates each bug against each sprint end date instead of deriving prior counts from today's open count.
2. **Latest-changedDate approximation documented in code** — The implementation preserves the existing data-model limitation that only the latest state and changed date are available.

### Test Results

**Verification:** `pnpm jest __tests__/lib/metrics/trend-service.test.ts __tests__/app/api/metrics/route.test.ts --runInBand`; `pnpm run typecheck`
- 46 focused Jest tests passed.
- TypeScript typecheck passed.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration(s)
- **Drift:** None
- **Security:** No new security concerns
- **Boundary Compliance:** Compliant

### Deviations from Spec

None
