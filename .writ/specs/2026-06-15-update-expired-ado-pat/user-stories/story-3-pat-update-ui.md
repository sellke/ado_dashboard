# Story 3: PAT Update Dashboard UX

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1, Story 2

## User Story

**As a** dashboard operator,
**I want** a clear way to update my ADO PAT when sync fails due to expired credentials,
**So that** I can recover without editing `.env` or restarting the server.

## Acceptance Criteria

1. **Given** sync fails with `errorCode: ADO_AUTH_FAILURE` (or auth-classified error),
   **When** the error alert renders,
   **Then** title is "ADO credentials expired or invalid" with **Update ADO credentials** CTA.

2. **Given** sync fails for a non-auth reason (e.g., DB error),
   **When** the error alert renders,
   **Then** the existing generic "Sync failed" alert appears with no credentials CTA.

3. **Given** the user clicks **Update ADO credentials**,
   **When** the modal opens,
   **Then** it shows read-only org, password PAT field, Save & validate, and Cancel.

4. **Given** the user submits a valid PAT,
   **When** the API returns success,
   **Then** success toast appears, modal closes, and user can retry Sync Now.

5. **Given** the user submits an invalid PAT,
   **When** the API returns `AUTH_REJECTED`,
   **Then** modal shows inline error and remains open for correction.

## Implementation Tasks

- [x] Create `AdoCredentialsModal.tsx` with Mantine Modal, PasswordInput, org display
- [x] Wire modal to `POST /api/ado/credentials` and `GET` for initial status/patHint
- [x] Extend `SyncControl` props: `isAuthError`, `onUpdateCredentials` — distinct alert title/CTA
- [x] Update `DashboardContainer`: detect auth errors from sync response `errorCode` or message
- [x] Add `errorCode: ADO_AUTH_FAILURE` to sync route when `isAdoAuthError` matches root cause
- [x] Add component tests: auth alert CTA, modal validation, success close, generic error unchanged
- [x] Update `SyncControl.story.tsx` with auth-error story variant

## Technical Notes

- Modal PAT field: `type="password"`, clear on close, never store in localStorage.
- Disable Save button while request in-flight; debounce double-submit.
- On success, optionally auto-dismiss sync error so user sees clean state before retry.
- Match existing Mantine patterns from `MetricConfigPanel` / `WorkstreamRegistryPanel`.

## Definition of Done

- [x] Auth failures show remediation path; non-auth failures unchanged
- [x] Modal validates and saves via Story 2 API
- [x] Component tests cover auth vs generic error branches
- [x] Storybook story for auth-error SyncControl state
- [ ] Manual smoke: expire PAT → see CTA → update → sync succeeds without restart

## Context for Agents

- **Experience design:** spec.md → Entry point, Happy path, Error experience sections.
- **Interaction edge cases:** technical-spec → double-click Save, paste whitespace.
- **Files:** `SyncControl.tsx`, `DashboardContainer.tsx`, new `AdoCredentialsModal.tsx`.
- **Do not log PAT** in client `console.log` debugging.

## Visual References

No mockups provided — match existing dashboard alert/modal patterns (`SyncControl`, settings panels).
Use Mantine `Alert` (red, `IconAlertCircle`) and `Modal` with `PasswordInput`.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

1. **`components/Dashboard/AdoCredentialsModal.tsx`**
   - Added the credential update modal with read-only org, password PAT input, inline errors, save validation, success notification, and PAT clearing on close/save.
2. **`__tests__/components/Dashboard/AdoCredentialsModal.test.tsx`**
   - Covered status load, invalid PAT rejection, success close, success notification, trimmed POST body, and no full-PAT rendering.
3. **`__tests__/app/api/sync/ado/route-auth.test.ts`**
   - Covered additive `ADO_AUTH_FAILURE` sync response mapping for auth-classified failures.

### Files Modified

- **`components/Dashboard/SyncControl.tsx`**
  - Added auth-specific alert title and `Update ADO credentials` CTA while keeping generic failures unchanged.
- **`components/Dashboard/DashboardContainer.tsx`**
  - Added credential modal state, auth error detection, modal open/close wiring, and sync error clearing after save.
- **`components/Dashboard/SyncControl.story.tsx`**
  - Added `AuthFailure` Storybook variant.
- **`app/api/sync/ado/route.ts`**
  - Added `errorCode: ADO_AUTH_FAILURE` for auth-classified sync failures.
- **`app/api/ado/projects/route.ts`** and **`app/api/ado/teams/route.ts`**
  - Added auth error codes to ADO discovery failures.
- **`lib/sync/ado-client.ts`**
  - Narrowed auth classification to include status codes embedded in sync summary messages.
- **`lib/sync/orchestrator.ts`**
  - Removed live localhost debug-ingest instrumentation from the sync path.
- **Focused tests**
  - Extended `SyncControl`, `DashboardContainer`, and ADO auth classifier tests for auth vs generic paths.

### Implementation Decisions

1. **Additive error code** — Sync responses retain their existing shape and add `errorCode` only for auth failures.
2. **Narrow legacy fallback** — Dashboard checks `ADO_AUTH_FAILURE` first and only falls back to ADO/PAT-specific legacy messages, avoiding generic `invalid` misclassification.
3. **Single modal owner** — `DashboardContainer` owns the modal and clears auth sync state after a successful save, leaving retry as an explicit user action.

### Test Results

**Verification:** Focused Story 3 tests, typecheck, scoped ESLint, and review gate passed.

- `pnpm jest __tests__/components/Dashboard/SyncControl.test.tsx __tests__/components/Dashboard/AdoCredentialsModal.test.tsx __tests__/components/Dashboard/DashboardContainer.test.tsx __tests__/app/api/sync/ado/route-auth.test.ts __tests__/lib/sync/ado-client-auth.test.ts --runInBand` — 35/35 passing
- `pnpm typecheck` — passing
- Scoped ESLint for Story 3 touched files — passing

### Review Outcome

**Result:** PASS

- **Iteration count:** 4 iteration(s)
- **Drift:** None after narrowing auth fallback and updating the existing Storybook file
- **Security:** Clean; no PAT logging or client persistence, and debug-ingest hooks removed from touched sync/ADO paths
- **Boundary Compliance:** Dashboard remediation, sync response propagation, and ADO discovery auth classification only

### Deviations from Spec

None
