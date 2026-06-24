# Story 4: Regression Coverage

> **Status:** Completed ✅
> **Priority:** Normal
> **Dependencies:** Stories 2 and 3

## User Story

**As a** developer,
**I want** end-to-end tests for cookie persistence, localStorage migration, cross-dashboard isolation, and SSR/client consistency,
**So that** the cookie migration cannot regress scope behavior, first-paint scope, or scoped API fetches after Stories 2 and 3 ship.

## Acceptance Criteria

1. [x] **Given** a valid workstream scope cookie exists for a dashboard, **when** `DashboardContainer` mounts without `initialScopeIds`, **then** the saved IDs are restored from the cookie and scoped metrics, milestones, and sprint-story fetches use those IDs.
2. [x] **Given** localStorage holds a valid scope and no cookie exists, **when** the dashboard mounts, **then** migration writes the cookie, removes the localStorage key, and subsequent loads use the cookie only.
3. [x] **Given** both cookie and localStorage contain scopes for the same dashboard, **when** migration runs, **then** the cookie value wins and localStorage is not copied over the existing cookie.
4. [x] **Given** separate scopes are saved for `main` and `streams` dashboards, **when** each dashboard loads, **then** each reads only its namespaced cookie and does not leak scope across dashboard IDs.
5. [x] **Given** a dashboard page reads scope server-side, **when** `DashboardContainer` renders with `initialScopeIds`, **then** the first scoped fetch uses the SSR prop and matches what a client cookie read would produce for the same payload.

## Implementation Tasks

- [x] **4.1** Write `__tests__/lib/dashboard/settings-cookies.test.ts` covering encode/decode round-trip, URI-safe JSON payloads, attribute defaults (`Path`, `SameSite`, `Max-Age`, production `Secure`), and malformed or missing cookie header extraction.
- [x] **4.2** Extend `__tests__/lib/dashboard/workstream-scope.test.ts` with cookie load/save adapters, idempotent `migrateLocalStorageScopeToCookie` paths (cookie wins, valid migration, invalid localStorage ignored, blocked storage), and malformed cookie fallback to null.
- [x] **4.3** Update `__tests__/components/Dashboard/DashboardContainer.test.tsx` to replace localStorage persistence mocks with cookie mocks: restore saved scope on mount, refetch after modal Save writes a cookie, and preserve stale-ID reconciliation behavior.
- [x] **4.4** Add component tests for `initialScopeIds` SSR wiring: first fetch uses the prop without waiting for client cookie read, and client Save overwrites the cookie for later visits.
- [x] **4.5** Add cross-dashboard isolation tests proving `dashboardWorkstreamScope:v1:main` and `dashboardWorkstreamScope:v1:streams` cookies do not interfere.
- [x] **4.6** Run focused regression suites for `settings-cookies`, `workstream-scope`, and `DashboardContainer`; confirm existing scoped API behavior tests still pass unchanged.
- [x] **4.7** Verify all acceptance criteria are met and document any gaps (e.g., page-level SSR tests deferred to manual check) before marking the story complete.

## Technical Notes

- This story is test-only regression coverage; implementation should already exist from Stories 1–3. Do not add production code unless a test reveals a real defect.
- Reuse existing `DashboardContainer` fetch-mock patterns from the localStorage restore tests; swap `window.localStorage.setItem` for cookie header or `setClientCookie` mocks.
- Migration tests must assert localStorage key removal on success and no-op when a cookie is already present — mirror the idempotent contract in `technical-spec.md`.
- SSR consistency tests can stay at the component boundary (`initialScopeIds` prop) rather than full Next.js page renders; mock `next/headers` only if adding page-level tests.
- Mock `document.cookie` writes carefully in JSDOM — prefer injecting a parsed cookie string into load helpers where the production code supports a `cookieHeaderOrGetter` parameter.

## Context for Agents

- **Error map rows:** Parse cookie value, Read server cookie, Write client cookie, Migrate localStorage, Encode cookie value — from `sub-specs/technical-spec.md` → Error & Rescue Map.
- **Shadow paths:** Load on page visit, Migrate from localStorage — from `sub-specs/technical-spec.md` → Shadow Paths.
- **Business rules:** Cookie is sole persistence store after migration; one cookie per dashboard ID; payload shape unchanged; empty included set cannot be saved; stale ID reconciliation unchanged — from `spec.md` → Business Rules.
- **Experience:** First paint uses saved scope via SSR initial prop; malformed cookie falls back silently; cookie write failure keeps in-memory scope without new UI — from `spec.md` → Experience Design.
- **Traceability:** `sub-specs/technical-spec.md` → Traceability → Story 4 row.
- **Relevant files:** `__tests__/lib/dashboard/settings-cookies.test.ts`, `__tests__/lib/dashboard/workstream-scope.test.ts`, `__tests__/components/Dashboard/DashboardContainer.test.tsx`, `lib/dashboard/settings-cookies.ts`, `lib/dashboard/workstream-scope.ts`, `components/Dashboard/DashboardContainer.tsx`.

## Definition of Done

- [x] All implementation tasks completed.
- [x] All acceptance criteria verified by automated tests.
- [x] Cookie persistence, migration, cross-dashboard isolation, and SSR prop consistency are covered.
- [x] Existing scoped metrics, milestones, and sprint-story fetch tests pass without regression.
- [x] No new production code added unless fixing a defect found during test authoring.

---

## What Was Built

**Implementation Date:** 2026-06-17

### Files Created

[None created beyond Story 1 and Story 3 test files]

### Files Modified

- **`__tests__/lib/dashboard/settings-cookies.test.ts`**
  - Covered cookie encoding, attribute defaults, malformed headers, browser writes, and server reads.
- **`__tests__/lib/dashboard/workstream-scope.test.ts`**
  - Covered cookie adapters, migration success, cookie-wins idempotence, invalid legacy storage, and blocked storage.
- **`__tests__/components/Dashboard/DashboardContainer.test.tsx`**
  - Covered cookie restore, migration, modal Save, SSR prop first fetch, stale ID reconciliation, and main/streams isolation.
- **`__tests__/app/dashboard/page.test.tsx`**
  - Covered SSR page prop wiring and dashboard ID isolation.

### Implementation Decisions

1. **Regression coverage stays at helper/component/page boundaries** — No extra production code was needed for Story 4.
2. **Page SSR tests mock the domain helper** — Cookie parsing behavior remains covered in helper tests, while page tests verify dashboard-specific wiring.

### Test Results

**Verification:** Focused regression suites passed.
- `pnpm jest __tests__/lib/dashboard/settings-cookies.test.ts __tests__/lib/dashboard/workstream-scope.test.ts __tests__/components/Dashboard/DashboardContainer.test.tsx __tests__/app/dashboard/page.test.tsx --runInBand`

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** Low
- **Boundary Compliance:** Story 4 remained test-focused.

### Deviations from Spec

None
