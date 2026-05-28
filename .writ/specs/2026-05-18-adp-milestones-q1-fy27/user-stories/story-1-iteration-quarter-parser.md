# Story 1: Iteration Fiscal Quarter Parser

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** None
> **Spec:** `.writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md`

---

## User Story

**As a** developer maintaining the milestone dashboard,
**I want** a shared parser that extracts fiscal quarter and year from ADO sprint iteration paths,
**So that** the active quarter (`Q1 FY'27`) is derived from ADO — the same source as sprint scheduling — rather than hardcoded dates or stale Feature tags.

---

## Acceptance Criteria

- [ ] Given path `Event Streaming Platform\App\LiveLink - Yellow Box\Q1 FY27\Sprint 1`, when parsed, then returns `{ quarter: "Q1", fiscalYear: 27, displayLabel: "Q1 FY'27" }`
- [ ] Given path `Project\FY27\Q1\Sprint 27.1`, when parsed, then returns the same structured fiscal quarter
- [ ] Given a path with no recognizable quarter segment, when parsed, then returns `null`
- [ ] Given `isTargetMonthInFiscalQuarter` with Q1 FY27 and targetMonth `2026-05-01`, when evaluated, then returns `true`; given `2026-02-01`, then returns `false`
- [ ] Given today's date falls within a sprint whose path parses to Q1 FY27, when `getCurrentFiscalQuarter` is called, then it returns Q1 FY27

---

## Implementation Tasks

- [ ] **1.1** Write tests in `__tests__/lib/fiscal/parse-iteration-quarter.test.ts` for both path formats and malformed paths
- [ ] **1.2** Create `lib/fiscal/parse-iteration-quarter.ts` with `parseIterationQuarter(path)` and `FiscalQuarter` type
- [ ] **1.3** Write tests in `__tests__/lib/fiscal/quarter-window.test.ts` for Medtronic month windows (Q1–Q4, year-spanning Q3)
- [ ] **1.4** Create `lib/fiscal/quarter-window.ts` with `isTargetMonthInFiscalQuarter(targetMonth, fiscalQuarter)`
- [ ] **1.5** Create `lib/fiscal/get-current-fiscal-quarter.ts` resolving from current sprint in DB
- [ ] **1.6** Write tests for `getCurrentFiscalQuarter` with seeded sprint fixtures
- [ ] **1.7** Verify all new tests pass and exports are usable from milestones route

---

## Technical Notes

- Reuse sprint "current" resolution pattern from `lib/sync/iterations.ts` (`selectRollingSprints` date-range logic) — do not duplicate divergent current-sprint rules.
- `displayLabel` uses apostrophe: `FY'27` (matches issue wording).
- Q3 spans Nov–Jan — year logic must handle month 0 (January) belonging to prior calendar year's Q3 start.

---

## Context for Agents

- **Business rules:** spec.md → 📋 Business Rules → "Source of truth for current quarter"
- **Error map:** technical-spec.md → Error & Rescue Map → "Parse iteration path"
- **Shadow path:** technical-spec.md → Nil Input row (unparseable path)
- **Files:** `lib/sync/iterations.ts` (current sprint pattern), `prisma/seed.ts` (Q1 FY27 path example)

---

## Definition of Done

- [ ] Parser handles seed and test fixture path variants
- [ ] Quarter window correctly includes/excludes boundary months
- [ ] `getCurrentFiscalQuarter` returns null when no current sprint
- [ ] Unit tests pass; TypeScript clean
