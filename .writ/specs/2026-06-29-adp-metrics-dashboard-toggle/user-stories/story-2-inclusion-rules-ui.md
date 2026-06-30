# Story 2: Inclusion Rules UI

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1

## User Story

**As a** dashboard operator
**I want to** toggle ADP metrics inclusion from the Metric Configuration Inclusion Rules tab
**So that** I can configure program-wide ADP visibility alongside existing work-item inclusion rules

## Acceptance Criteria

- [ ] **Given** the Metric Configuration panel is open on the Inclusion Rules tab, **when** the page loads config successfully, **then** an **ADP metrics** section appears above the work-item-type grids with a checkbox reflecting `engine.includeAdpMetrics`.
- [ ] **Given** ADP is currently included, **when** I uncheck the box and click **Save rules**, **then** a success toast appears and the API receives `includeAdpMetrics: false`.
- [ ] **Given** ADP is currently excluded, **when** I check the box and click **Save rules**, **then** the API receives `includeAdpMetrics: true`.
- [ ] **Given** the panel shows the ADP section, **when** I read the helper text, **then** it states that changes take effect after reloading the dashboard and that ADO sync is unaffected.
- [ ] **Given** I save an ADP toggle change, **when** save succeeds, **then** no Recalculate-now prompt is shown (unlike threshold/engine tab saves).

## Implementation Tasks

- [ ] 2.1 Write component tests for ADP checkbox render, initial state from API, save payload, and success toast.
- [ ] 2.2 Add local state for `includeAdpMetrics` initialized from GET `/api/metric-config` `engine` field.
- [ ] 2.3 Add **ADP metrics** section with checkbox and helper text to Inclusion Rules tab in `MetricConfigPanel.tsx`.
- [ ] 2.4 Extend `saveRules()` to send `{ rules, includeAdpMetrics }` and merge `includeAdpMetrics` from response.
- [ ] 2.5 Ensure save failure shows existing error toast; checkbox draft state remains editable.
- [ ] 2.6 Match existing Inclusion Rules layout patterns (spacing, dimmed description text, Save rules button placement).
- [ ] 2.7 Verify acceptance criteria in browser or component tests.

## Technical Notes

- Load populates checkbox from `data.engine.includeAdpMetrics ?? true`.
- Do not auto-reload dashboard after save — reload requirement is intentional per contract.
- Work-item rule checkboxes and ADP checkbox share one Save rules action.

## Context for Agents

- **Experience:** Entry via Metric configuration → Inclusion Rules — `spec.md` → Experience Design
- **Business rules:** Save via Save rules; reload to apply — `spec.md` → Business Rules
- **Error map:** [Save rules + includeAdpMetrics DB failure] — panel uses existing toast error pattern
- **API:** `sub-specs/api-spec.md` → PUT `/api/metric-config/rules`
- **Pattern reference:** Existing Inclusion Rules tab in `MetricConfigPanel.tsx` (lines ~457–496)
- **Files:** `components/Dashboard/MetricConfigPanel.tsx`, `__tests__/components/Dashboard/MetricConfigPanel.test.tsx`

## Definition of Done

- [ ] All implementation tasks completed
- [ ] All acceptance criteria met
- [ ] Component tests passing
- [ ] No dashboard fetch gating in this story (Story 3)
