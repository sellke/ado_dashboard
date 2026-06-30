# Story 3: Dashboard Fetch and Panel Gating

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard user
**I want to** see or not see ADP Milestones based on the program-wide config after I reload the dashboard
**So that** excluded ADP content does not load or display unnecessarily

## Acceptance Criteria

- [ ] **Given** `includeAdpMetrics` is `true` and I reload the dashboard, **when** metrics load successfully, **then** `/api/milestones` is fetched and the ADP Milestones panel is visible in Program Summary.
- [ ] **Given** `includeAdpMetrics` is `false` and I reload the dashboard, **when** the page loads, **then** no `/api/milestones` request is made and the ADP Milestones section is not rendered.
- [ ] **Given** ADP is excluded, **when** I change workstream scope and reload, **then** metrics refetch with new scope but milestones are still not fetched.
- [ ] **Given** ADP is excluded, **when** I run Sync Now and reload, **then** metrics refresh after sync but milestones are still not fetched.
- [ ] **Given** metric config GET fails on dashboard load, **when** the dashboard renders, **then** ADP defaults to included (safe fallback matching pre-feature behavior).

## Implementation Tasks

- [ ] 3.1 Write `DashboardContainer` tests asserting milestone fetch is skipped when config returns `includeAdpMetrics: false`.
- [ ] 3.2 Write `ProgramSummarySection` test asserting ADP section hidden when `showAdpMetrics={false}`.
- [ ] 3.3 Load metric config on `DashboardContainer` mount; store `includeAdpMetrics` in state.
- [ ] 3.4 Guard `fetchMilestones`, post-sync milestone refresh, and scope-refresh milestone effect with `isAdpMetricsIncluded()`.
- [ ] 3.5 When excluded: set milestones empty, `milestonesLoading: false`, `programRollup: null`; skip network call.
- [ ] 3.6 Add `showAdpMetrics` prop through `DashboardShell` to `ProgramSummarySection`; conditionally render ADP stack.
- [ ] 3.7 Verify acceptance criteria with component/integration tests.

## Technical Notes

- Applies to both `main` and `streams` dashboards (same `DashboardContainer`).
- In-session save from Story 2 does not update container state until reload — do not subscribe to config changes in this story.
- `milestonesLoading` should not show spinner when ADP excluded (idle, not loading).

## Context for Agents

- **Shadow paths:** [Dashboard load ADP off], [Dashboard load ADP on] — `sub-specs/technical-spec.md`
- **Business rules:** Skip fetch when excluded; workstream scope independent — `spec.md` → Business Rules
- **State catalog:** `spec.md` → Detailed Requirements → State Catalog
- **Files:** `components/Dashboard/DashboardContainer.tsx`, `DashboardShell.tsx`, `ProgramSummarySection.tsx`, `__tests__/components/Dashboard/DashboardContainer.test.tsx`, `ProgramSummarySection.test.tsx`

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All acceptance criteria met
- [ ] Component tests passing
- [ ] Export gating deferred to Story 4
