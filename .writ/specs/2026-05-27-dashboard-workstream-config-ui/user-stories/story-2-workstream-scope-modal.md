# Story 2: Workstream Scope Modal

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1
> **Spec:** `.writ/specs/2026-05-27-dashboard-workstream-config-ui/spec.md`

---

## User Story

**As a** dashboard user,
**I want** a Dashboard action that opens a modal for selecting which synced workstreams are included,
**So that** I can control the visible Dashboard scope with explicit Save and Cancel behavior without changing synced ADO data.

---

## Acceptance Criteria

- [x] Given the Dashboard is loaded, when the user activates the workstream scope action near the existing Export/Sync controls, then a modal opens with the current included/excluded workstream state.
- [x] Given the all-workstreams list has loaded, when the modal renders, then each synced workstream is displayed with a clear included/excluded state using accessible labels and keyboard-operable controls.
- [x] Given the user changes the draft selection and clicks Save, when at least one workstream remains included, then the Story 1 storage contract persists the selected IDs, the modal closes, and the Dashboard apply handler is called so data can refetch.
- [x] Given the user changes the draft selection and clicks Cancel or closes the modal, when the modal exits, then draft changes are discarded and the active saved scope remains unchanged.
- [x] Given the user deselects every workstream, when Save is attempted, then the modal blocks saving the empty included set and shows a validation message.
- [x] Given the all-workstreams list cannot load, when the modal opens, then it shows a recoverable error state with retry or close affordances and does not overwrite the active scope.
- [x] Given keyboard and assistive technology users interact with the modal, when it opens and closes, then focus management, dialog labeling, checkbox/switch labels, and primary/secondary actions follow existing Mantine accessibility patterns.

---

## Implementation Tasks

- [x] **2.1** Write component tests for `WorkstreamScopeModal` covering open/close behavior, current included/excluded states, Save, Cancel, empty-selection validation, list-load error, retry affordance, and keyboard basics.
- [x] **2.2** Add the `WorkstreamScopeModal` component using Mantine modal, layout, checkbox or switch controls, inline validation, loading, and recoverable error states consistent with existing Dashboard patterns.
- [x] **2.3** Add a Dashboard-level action in `components/Dashboard/DashboardContainer.tsx` near `ExportControl` and `SyncControl` to open the modal with a clear label such as "Workstream scope" or "Configure workstreams".
- [x] **2.4** Wire modal props to Story 1 scope storage and all-workstreams list data: current selected IDs, draft selection, loading/error state, Save persistence, Cancel discard, and optional retry.
- [x] **2.5** Ensure successful Save calls the Dashboard apply/refetch handler after persisting the browser-local, dashboard-ID-namespaced included workstream IDs.
- [x] **2.6** Preserve accessibility and responsive behavior: labelled dialog, keyboard-operable toggles, focus returning to the trigger, disabled or guarded Save for empty selections, and scrollable workstream list at narrow widths.
- [x] **2.7** Verify the new modal/container tests pass and run the relevant Dashboard component test suite for regressions.

---

## Technical Notes

- Use the Story 1 storage helper and `GET /api/workstreams` contract rather than duplicating local storage parsing or inferring options from the currently scoped Dashboard payload.
- The modal owns draft UI state while open; `DashboardContainer` remains the orchestration point for the active scope, all-workstreams loading, Dashboard fetch lifecycle, and export-facing state.
- Save is explicit and applies the include list. Cancel, backdrop close, and escape close should all discard unsaved draft changes.
- Empty included sets are invalid and must not be persisted. If no valid saved preference exists, the Dashboard falls back to the static default behavior defined by Story 1.
- This story adds the user-facing modal and apply hook only; full propagation through metrics, milestones, sprint stories, and export is completed in Story 3.

---

## Context for Agents

- **Parent contract:** `spec.md` -> Contract Summary, Experience Design, Business Rules, Detailed Requirements items 1, 3, 4, 6, and 7.
- **UI behavior:** `spec.md` -> Experience Design -> User Journey, State Catalog, Interaction Patterns, and Responsive Behavior.
- **Storage dependency:** `spec.md` -> Business Rules -> Persistence, Defaults, Scope Semantics, and Empty Scope.
- **Technical component plan:** `sub-specs/technical-spec.md` -> UI Component Plan -> `WorkstreamScopeModal` and `DashboardContainer`.
- **Failure coverage:** `sub-specs/technical-spec.md` -> Error & Rescue Map rows for Load all workstreams and Save modal scope; Shadow Paths -> Workstream list modal.
- **Interaction edge cases:** `sub-specs/technical-spec.md` -> Interaction Edge Cases for double Save, close with unsaved draft, and scope changes while fetches are in flight.
- **Relevant code:** `components/Dashboard/DashboardContainer.tsx`, existing `ExportControl` and `SyncControl`, Story 1 scope helper, and `GET /api/workstreams`.

---

## Definition of Done

- [x] Dashboard exposes a labelled action near Export/Sync that opens the workstream scope modal.
- [x] Modal displays all synced workstreams with current included/excluded state and accessible toggle controls.
- [x] Save persists a non-empty included ID set through the Story 1 storage contract and calls the Dashboard apply/refetch handler.
- [x] Cancel and close discard draft changes without changing the active saved scope.
- [x] Loading, recoverable list-load error, empty-selection validation, responsive layout, and keyboard/accessibility behavior are covered by tests.
- [x] Relevant component and Dashboard regression tests pass.
