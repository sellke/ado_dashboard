# Story 2: Milestone API Fiscal Quarter Filtering

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1
> **Spec:** `.writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md`

---

## User Story

**As a** program manager,
**I want** the milestones API to return only Features belonging to the current fiscal quarter,
**So that** rollup counts and downstream views (dashboard, export) never include stale Q4 or out-of-window milestones.

---

## Acceptance Criteria

- [ ] Given current sprint is Q1 FY27 and milestones include both Q1 (in-window) and Q4 tags, when GET `/api/milestones` runs, then response contains only Q1 in-window milestones
- [ ] Given `programRollup.quarterlyMilestones.total`, when computed, then counts only filtered in-quarter milestones
- [ ] Given no resolvable fiscal quarter, when GET runs, then returns empty milestones array and rollup with null/zero quarter counts
- [ ] Given a milestone with Q1 tag but targetMonth outside Q1 FY27 window, when filtered, then it is excluded
- [ ] Given existing milestones route tests, when updated, then all pass with Q1 FY27 scenarios

---

## Implementation Tasks

- [ ] **2.1** Write route tests in `__tests__/app/api/milestones/route.test.ts` for fiscal quarter filtering (Q1-only, Q4 excluded, null quarter)
- [ ] **2.2** Integrate `getCurrentFiscalQuarter` into `app/api/milestones/route.ts` GET handler
- [ ] **2.3** Add `milestoneMatchesFiscalQuarter` filter before progress computation
- [ ] **2.4** Update `computeProgramMilestoneRollup` in `lib/milestones/calculator.ts` to use filtered inputs; set rollup `quarter` to fiscal display label
- [ ] **2.5** Add optional `fiscalQuarterLabel` to `ApiProgramMilestoneRollup` in `lib/milestones/types.ts` if needed for UI
- [ ] **2.6** Update `lib/dashboard/adapter.ts` grouping functions to handle single-quarter filtered data (defensive pass)
- [ ] **2.7** Verify route + calculator tests pass; no regressions in adapter tests

---

## Technical Notes

- Prefer **one filter point** in the API route — adapter should not re-implement fiscal logic unless defensive.
- PPTX export (`lib/export/`) consumes the same API response — filtering here automatically fixes export rollup.
- Mock current sprint in route tests via prisma test DB or dependency injection pattern used in existing route tests.

---

## Context for Agents

- **Error map:** technical-spec.md → "Fiscal filter" and "Resolve current sprint" rows
- **Shadow paths:** technical-spec.md → Empty Input (Q4-only data during Q1 sprint)
- **Integration:** `lib/milestones/tag-derived.ts` (targetMonth/quarter derivation), `lib/milestones/calculator.ts`
- **Prior art:** `2026-03-23-adp-milestones-panel` story-2 ADP-MON filter pattern in same route

---

## Definition of Done

- [ ] API returns fiscal-quarter-scoped milestones only
- [ ] Rollup counts match filtered set
- [ ] Route tests cover happy, empty, and null-quarter paths
- [ ] All existing milestone tests updated/passing
