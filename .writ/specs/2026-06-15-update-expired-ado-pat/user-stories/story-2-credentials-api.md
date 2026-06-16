# Story 2: Credentials API

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** Story 1 (Credential store & ado-client)

## User Story

**As a** dashboard operator,
**I want** API endpoints to check credential status and save a validated PAT,
**So that** the UI can confirm configuration and persist credentials securely.

## Acceptance Criteria

1. **Given** a configured credential (DB or env),
   **When** `GET /api/ado/credentials` is called,
   **Then** response is `{ configured: true, org, patHint? }` with no PAT value.

2. **Given** no credential anywhere,
   **When** `GET /api/ado/credentials` is called,
   **Then** response is `{ configured: false, org }`.

3. **Given** a valid PAT in the request body,
   **When** `POST /api/ado/credentials` is called,
   **Then** ADO probe succeeds, PAT is encrypted and saved, cache invalidated, `200` returned.

4. **Given** an invalid/expired PAT,
   **When** `POST /api/ado/credentials` is called,
   **Then** response is `422` with `errorCode: AUTH_REJECTED` and no DB write.

5. **Given** `CREDENTIAL_ENCRYPTION_KEY` is missing,
   **When** `POST /api/ado/credentials` is called,
   **Then** response is `503` with `errorCode: ENCRYPTION_UNAVAILABLE`.

## Implementation Tasks

- [x] Create `app/api/ado/credentials/route.ts` with GET and POST handlers
- [x] GET: call `isCredentialConfigured()`, return org from env, optional `patHint` from DB
- [x] POST: validate body, call `probeAdoPat`, on success `savePat` + `invalidatePatCache`
- [x] Map errors to structured `errorCode` responses per technical-spec
- [x] Add API tests: happy path, AUTH_REJECTED, VALIDATION_ERROR, ENCRYPTION_UNAVAILABLE
- [x] Confirm response bodies never contain full PAT (audit test)

## Technical Notes

- Reuse `probeAdoPat` from Story 1 — do not duplicate ADO fetch logic.
- `patHint`: store last 4 characters on save for operator confirmation in UI.
- POST body validation: trim, min length 20, max 200.
- `ADO_ORG` required for probe; return `503 MISSING_ORG` if unset.

## Definition of Done

- [x] GET and POST endpoints implemented and documented in technical-spec
- [x] All error codes from Error & Rescue Map have planned responses
- [x] API tests ≥80% coverage on new route
- [x] Security review: no PAT in responses or server logs

## Context for Agents

- **Error map:** technical-spec → rows for Probe ADO, Save encrypted PAT, GET status.
- **Shadow paths:** Happy (valid save), Nil (empty PAT → 422), Upstream (ADO 503 on probe).
- **Business rules:** Saving does not mutate `.env`; org read-only from env.
- **Files:** `app/api/ado/credentials/route.ts`, depends on `lib/sync/credentials.ts`.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

1. **`app/api/ado/credentials/route.ts`**
   - Added GET status and POST validate-save handlers for ADO credentials.
2. **`__tests__/app/api/ado/credentials/route.test.ts`**
   - Covered status response, validation errors, missing org, auth rejection, encryption setup failure, save failure, happy path, and no full-PAT echo.

### Files Modified

[None modified]

### Implementation Decisions

1. **Single route for GET/POST** — Implemented `/api/ado/credentials` as the status and save endpoint, matching Story 2 acceptance criteria and the technical API section.
2. **Separated probe and save failures** — ADO validation failures return `ADO_UNAVAILABLE` or `AUTH_REJECTED`; storage failures return `SAVE_FAILED` so DB errors are not mislabeled as ADO probe errors.
3. **No extra validation library** — Used local shape checks for the small `{ pat }` body contract.

### Test Results

**Verification:** Focused Story 2 route tests, typecheck, scoped ESLint, and review gate passed.

- `pnpm jest __tests__/app/api/ado/credentials/route.test.ts --runInBand` — 7/7 passing
- `pnpm typecheck` — passing
- Scoped ESLint for Story 2 route/test — passing

### Review Outcome

**Result:** PASS

- **Iteration count:** 2 iteration(s)
- **Drift:** None
- **Security:** Clean; route never logs or returns full PAT
- **Boundary Compliance:** Owned route/test files only

### Deviations from Spec

None
