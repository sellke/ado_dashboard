# Story 4: Seeds, Fixtures & Test Alignment

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Story 2
> **Spec:** `.writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md`

---

## User Story

**As a** developer running the app locally or in CI,
**I want** seeds, fixtures, and tests to reflect Q1 FY'27 as the active quarter,
**So that** local behavior matches production intent and tests catch fiscal-quarter regressions.

---

## Acceptance Criteria

- [ ] Given `prisma/seed.ts`, when seeded, then current sprint resolves to Q1 FY27 iteration path
- [ ] Given dashboard test fixtures, when tests run, then mock milestones use Q1 tags and Q1 FY27 month targets (not Q4 FY26)
- [ ] Given `__tests__/lib/sync/milestone-features.test.ts`, when run, then reference dates align with Q1 FY'27 scenarios where quarter context matters
- [ ] Given `.writ/product/mission.md`, when read, then current position states Q1 FY'27
- [ ] Given full test suite, when run, then all tests pass

---

## Implementation Tasks

- [ ] **4.1** Audit test fixtures referencing Q4 FY26 / quarter `Q4` — list files to update (`grep quarter.*Q4`, `FY26`)
- [ ] **4.2** Update `__tests__/components/Dashboard/__fixtures__/dashboard-fixtures.ts` to Q1 FY27 milestone data
- [ ] **4.3** Update `__tests__/components/Dashboard/DashboardContainer.test.tsx` mock payloads (quarter, targetMonth, programRollup)
- [ ] **4.4** Update `__tests__/lib/dashboard/adapter.test.ts` `groupMilestonesByQuarter` fixtures if needed for FY labels
- [ ] **4.5** Update `.writ/product/mission.md` current position from Q4 FY26 → Q1 FY'27
- [ ] **4.6** Ensure `prisma/seed.ts` marks Q1 FY27 sprint as current (date range includes today or test reference date)
- [ ] **4.7** Run full test suite; fix any remaining Q4-stale assertions

---

## Technical Notes

- Seed already includes `Sprint 1 Q1 FY27` — verify date range covers test "today" or document test date overrides.
- Do not change ADP tag parsing rules — only update test data and docs.
- Manual ADO retag is documented in spec.md and technical-spec.md — not part of this story's code.

---

## Context for Agents

- **Success criteria:** spec.md → Success Criteria (seeds/fixtures/tests)
- **Files from issue:** `prisma/seed.ts`, `__tests__/prisma/seed.test.ts`, dashboard fixtures
- **Avoid:** modifying `lib/sync/milestone-features.ts` tag parsing unless tests reveal a bug

---

## Definition of Done

- [ ] No stale Q4 FY26 as default active quarter in seeds/fixtures
- [ ] mission.md updated
- [ ] Full test suite green
- [ ] seed.test.ts validates Q1 FY27 sprint
