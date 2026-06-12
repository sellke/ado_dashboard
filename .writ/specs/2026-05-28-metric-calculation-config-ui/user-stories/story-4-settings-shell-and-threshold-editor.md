# Story 4 — Settings panel shell + RAG threshold editor (Phase 1 UI)

> **Status:** Completed ✅
> **Completed:** 2026-06-12
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
3. **Given** the Thresholds tab, **when** it renders, **then** it shows
   `overheadPercent`, `carryOverRate`, and `deliveryToBugRatio` (with lower-is-healthier
   hint) — not other seeded threshold rows.
4. **Given** I enter `greenMin > greenMax`, **when** I Save, **then** an inline field error
   blocks the save.
5. **Given** the config API fails to load, **when** the panel opens, **then** a recoverable
   error is shown and no values are silently defaulted into a save.

## Implementation Tasks

- [x] Write component tests (open panel, edit, Save success, validation block, load error)
- [x] Add `components/Dashboard/MetricConfigPanel.tsx` (Mantine modal/drawer + `Tabs` shell)
- [x] Add Settings/gear entry point in the dashboard header (coordinate placement — see notes)
- [x] Build the **Thresholds** tab: `overheadPercent`, `carryOverRate`,
  `deliveryToBugRatio` green/amber min/max inputs + Save (direction hint for delivery-to-bug)
- [x] Wire inline validation to `lib/metrics/config-validation.ts`
- [x] Wire success/error notifications (Mantine `notifications`)

## Technical Notes

See `sub-specs/technical-spec.md` → "UI". This story delivers the panel shell + Phase 1
(thresholds) only; Story 5 adds the remaining tabs. Reuse shared validators from Story 3.

## Definition of Done

- [x] Panel opens from dashboard; Thresholds tab functional
- [x] Save persists and reflects on reload
- [x] Validation + error states behave per acceptance criteria
- [x] ≥80% coverage on new component code

## Context for Agents

- **Coordinate the entry point** with `2026-05-27-dashboard-workstream-config-ui` (also
  adds a dashboard config surface) so they share a consistent home.
- Existing dashboard header/components live in `components/Dashboard/`.
- Tabs to scaffold now (empty placeholders OK): Thresholds, Inclusion Rules, Velocity & Rolling.

---

## What Was Built

**Implementation Date:** 2026-06-12

### Files Created

1. **`components/Dashboard/MetricConfigPanel.tsx`**
   - Adds a Mantine modal with Thresholds, Inclusion Rules, and Velocity & Rolling tabs.
   - Implements Thresholds load/edit/save for `overheadPercent`, `carryOverRate`, and `deliveryToBugRatio`.
2. **`__tests__/components/Dashboard/MetricConfigPanel.test.tsx`**
   - Covers load, metric scoping, inline validation, blank numeric validation, save success, save error, and recoverable load error.

### Files Modified

- **`components/Dashboard/DashboardContainer.tsx`**
  - Adds the Metric configuration header action and opens the panel.
- **`__tests__/components/Dashboard/DashboardContainer.test.tsx`**
  - Covers the dashboard entry point opening the panel.
- **`app/layout.tsx`** and **`test-utils/render.tsx`**
  - Adds Mantine Notifications provider.
- **`package.json` / `pnpm-lock.yaml`**
  - Adds `@mantine/notifications` aligned to the app’s Mantine 8.2.1 stack.

### Implementation Decisions

1. **Save feedback uses Mantine notifications** — success and save failures are toast-style notifications, while load failures stay in-panel because the form cannot be trusted.
2. **Metric-specific input labels** — repeated fields include the metric name for screen-reader clarity.
3. **Story 5 placeholders only** — Inclusion Rules and Velocity & Rolling tabs are scaffolded but not editable until the next story.

### Test Results

**Verification:** `pnpm exec jest __tests__/components/Dashboard/MetricConfigPanel.test.tsx __tests__/components/Dashboard/DashboardContainer.test.tsx --runInBand`
- ✅ 19/19 focused component tests passing
- ✅ Review pass: no remaining Story 4 findings
- ⚠️ `pnpm run typecheck` remains blocked by baseline errors in `app/api/metrics/route.ts` and `lib/sync/ado-client.ts`

### Review Outcome

**Result:** PASS

- **Iteration count:** 2 review iterations
- **Drift:** None
- **Security:** Low risk; client-side validation mirrors server validation but server remains authoritative
- **Boundary Compliance:** Story 4 edits stayed within dashboard UI, notification provider setup, dependency metadata, and related tests

### Deviations from Spec

None.
