# Story 3: Dashboard Quarter-Only Views & Labels

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Story 2
> **Spec:** `.writ/specs/2026-05-18-adp-milestones-q1-fy27/spec.md`

---

## User Story

**As a** program manager viewing the dashboard,
**I want** milestone panels to show only the current fiscal quarter with a clear `Q1 FY'27` label,
**So that** I immediately see this quarter's ADP commitments without scrolling past stale Q4 data.

---

## Acceptance Criteria

- [ ] Given filtered Q1 FY'27 milestone data, when Program Summary ADP panel renders, then badge shows `Q1 FY'27` and only in-quarter Features appear
- [ ] Given filtered data, when a workstream card's MilestoneGoalsPanel renders, then only in-quarter month groups appear
- [ ] Given zero in-quarter milestones, when panels render, then user sees "No milestone data for Q1 FY'27" (program) or equivalent workstream empty copy
- [ ] Given fiscal quarter cannot be resolved, when panels render, then user sees "Unable to determine current fiscal quarter" (not stale Q4 data)
- [ ] Given loading and error props, when unchanged from prior behavior, then existing skeleton/error UI still works

---

## Implementation Tasks

- [ ] **3.1** Write component tests for `MilestoneQuarterlyPanel` with `Q1 FY'27` label and single-quarter display
- [ ] **3.2** Update `MilestoneQuarterlyPanel.tsx` to prefer fiscal display label from quarter group or rollup prop
- [ ] **3.3** Write tests for `MilestoneGoalsPanel` empty state with fiscal quarter context
- [ ] **3.4** Update `MilestoneGoalsPanel.tsx` empty copy to reference current fiscal quarter when provided
- [ ] **3.5** Wire fiscal quarter label through `DashboardContainer` → `DashboardShell` → `ProgramSummarySection` / workstream cards if new prop needed
- [ ] **3.6** Update `DashboardIntegration.test.tsx` and `DashboardContainer.test.tsx` fixtures from Q4 to Q1 FY27
- [ ] **3.7** Verify component tests pass; visual regression via Storybook optional

---

## Technical Notes

- Minimal UI change — mostly labels and empty states; layout unchanged from `2026-03-23-adp-milestones-panel`.
- If API already returns only one quarter group, panel may need only label formatting (`Q1` → `Q1 FY'27`).
- Pass `fiscalQuarterLabel` from container if not embedded in `MilestoneQuarterGroup.quarter`.

---

## Context for Agents

- **Experience:** spec.md → 🎯 Experience Design → Error experience
- **Shadow paths:** technical-spec.md → Dashboard milestones flow table
- **Files:** `components/Dashboard/DashboardContainer.tsx`, `DashboardShell.tsx`, `ProgramSummarySection.tsx`, `WorkstreamHealthCard.tsx`

---

## Definition of Done

- [ ] Program quarterly panel shows FY label and quarter-only data
- [ ] Workstream monthly panel filtered and labeled appropriately
- [ ] Empty/unresolvable quarter states implemented
- [ ] Dashboard component tests updated and passing
