# Story 4 — Settings panel shell + RAG threshold editor (Phase 1 UI)

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Story 3

## User Story

As a **dashboard user**, I want **a Metric Configuration panel where I can view and edit
RAG thresholds**, so that **I can adjust how metric health is graded without code changes**.

## Acceptance Criteria

1. **Given** I'm on the dashboard, **when** I click the Settings/gear action, **then** the
   Metric Configuration panel opens with a **Thresholds** tab showing current values.
2. **Given** I edit a threshold and Save, **when** validation passes, **then** values
   persist via `PUT /api/metric-config/thresholds` and a success toast appears.
3. **Given** I enter `greenMin > greenMax`, **when** I Save, **then** an inline field error
   blocks the save.
4. **Given** the config API fails to load, **when** the panel opens, **then** a recoverable
   error is shown and no values are silently defaulted into a save.

## Implementation Tasks

- [ ] Write component tests (open panel, edit, Save success, validation block, load error)
- [ ] Add `components/Dashboard/MetricConfigPanel.tsx` (Mantine modal/drawer + `Tabs` shell)
- [ ] Add Settings/gear entry point in the dashboard header (coordinate placement — see notes)
- [ ] Build the **Thresholds** tab: per-metric green/amber min/max inputs + Save
- [ ] Wire inline validation to `lib/metrics/config-validation.ts`
- [ ] Wire success/error notifications (Mantine `notifications`)

## Technical Notes

See `sub-specs/technical-spec.md` → "UI". This story delivers the panel shell + Phase 1
(thresholds) only; Story 5 adds the remaining tabs. Reuse shared validators from Story 3.

## Definition of Done

- [ ] Panel opens from dashboard; Thresholds tab functional
- [ ] Save persists and reflects on reload
- [ ] Validation + error states behave per acceptance criteria
- [ ] ≥80% coverage on new component code

## Context for Agents

- **Coordinate the entry point** with `2026-05-27-dashboard-workstream-config-ui` (also
  adds a dashboard config surface) so they share a consistent home.
- Existing dashboard header/components live in `components/Dashboard/`.
- Tabs to scaffold now (empty placeholders OK): Thresholds, Inclusion Rules, Velocity & Rolling.
