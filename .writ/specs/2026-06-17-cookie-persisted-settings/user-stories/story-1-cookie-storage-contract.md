# Story 1: Cookie Storage Contract

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** developer
**I want to** centralize cookie encode/decode helpers and workstream-scope cookie adapters with a one-time localStorage migration utility
**So that** dashboard workstream scope can persist in HTTP cookies, be read server-side via `cookies()`, and share the same parse/validate logic as today's storage helpers

## Acceptance Criteria

- [x] **Given** a valid workstream scope payload JSON string, **when** `parseDashboardWorkstreamScope` is invoked (directly or via cookie adapters), **then** normalized included workstream IDs are returned and malformed, empty, or absent values return `null`.
- [x] **Given** cookie attribute defaults from `settings-cookies.ts`, **when** a scope is saved client-side, **then** the cookie is written with name `dashboardWorkstreamScope:v1:{dashboardId}`, `Path=/`, `SameSite=Lax`, `Max-Age=31536000`, and `Secure` only in production.
- [x] **Given** a server request with a valid scope cookie, **when** `loadDashboardWorkstreamScopeFromCookies` (or equivalent server read wrapper) runs, **then** parsed IDs match the stored payload without duplicating parse logic outside `parseDashboardWorkstreamScope`.
- [x] **Given** valid scope data in `localStorage` and no existing cookie, **when** `migrateLocalStorageScopeToCookie` runs, **then** the cookie is written, the localStorage key is removed, and migrated IDs are returned.
- [x] **Given** a cookie already exists or localStorage is absent/invalid, **when** migration runs, **then** it is idempotent (cookie wins; no overwrite from localStorage; invalid localStorage does not write a cookie).

## Implementation Tasks

- [x] 1.1 Write unit tests for `lib/dashboard/settings-cookies.ts` — encode/decode round-trip, attribute string building, special characters in JSON values, and server read wrapper with mocked `cookies()`.
- [x] 1.2 Write unit tests for cookie adapters and migration in `__tests__/lib/dashboard/workstream-scope.test.ts` — load/save via cookie header, empty-selection rejection, malformed payloads, migration happy path, cookie-wins skip, and invalid localStorage no-op.
- [x] 1.3 Create `lib/dashboard/settings-cookies.ts` with attribute constants, `serializeCookieValue` / `parseCookieHeader`, `setClientCookie`, and async `readServerCookie` using `next/headers` (server-safe import pattern).
- [x] 1.4 Extend `lib/dashboard/workstream-scope.ts` with `loadDashboardWorkstreamScopeFromCookies`, `saveDashboardWorkstreamScopeToCookie`, and `migrateLocalStorageScopeToCookie`, delegating parse/validation to existing helpers.
- [x] 1.5 Preserve existing `Storage`-based `loadDashboardWorkstreamScope` / `saveDashboardWorkstreamScope` signatures unchanged for Story 2 wiring; do not wire `DashboardContainer` in this story.
- [x] 1.6 Run focused test coverage for new and extended modules (`settings-cookies.test.ts`, `workstream-scope.test.ts`).
- [x] 1.7 Verify all acceptance criteria are met and existing workstream-scope tests still pass.

## Technical Notes

- Cookie is the sole persistence target after migration; localStorage is read once by the migration utility then cleared — no dual-write helpers in this story.
- Reuse `parseDashboardWorkstreamScope`, `dashboardWorkstreamScopeKey`, and `saveDashboardWorkstreamScope` validation semantics (non-empty IDs, normalization) — do not fork payload shape or parsing rules.
- `settings-cookies.ts` must not pull client-only APIs into server bundles; keep `document.cookie` usage inside client-callable functions and isolate `next/headers` to the server read path.
- No third-party cookie libraries; native `document.cookie` and Next.js `cookies()` are sufficient for this payload size.
- `HttpOnly` is intentionally `false` — client modal writes in Story 2 require a client-writable cookie.
- Existing `resolveDashboardWorkstreamScope` and query-param helpers remain unchanged in this story.

## Context for Agents

- **Error map rows:** [Parse cookie value, Encode cookie value, Migrate localStorage, Migrate localStorage (invalid payload)] — from `sub-specs/technical-spec.md` → Error & Rescue Map
- **Shadow paths:** [Migrate from localStorage] — from `sub-specs/technical-spec.md` → Shadow Paths
- **Business rules:** [Cookie sole store after migration, One cookie per dashboard ID (key pattern), Payload shape unchanged, Cookie attributes (Path/SameSite/Max-Age/Secure), Not HttpOnly, Empty included set cannot be saved] — from `spec.md` → Business Rules
- **Experience:** [Malformed/missing cookie falls back silently (same as localStorage today), Cookie write failure applies in-memory only (no new UI — deferred to Story 2)] — from `spec.md` → Experience Design → Error experience
- See `spec.md` → `## Detailed Requirements` → `### Cookie Storage Module` for module API expectations.
- See `sub-specs/technical-spec.md` → `## Cookie Contract` and `## Module Responsibilities` for attribute values and function names.
- Relevant files: `lib/dashboard/settings-cookies.ts` (new), `lib/dashboard/workstream-scope.ts` (extensions), `__tests__/lib/dashboard/settings-cookies.test.ts` (new), `__tests__/lib/dashboard/workstream-scope.test.ts`.

## Definition of Done

- [x] All implementation tasks completed
- [x] All acceptance criteria met
- [x] New and extended unit tests passing; existing workstream-scope tests green
- [x] No `DashboardContainer` or page wiring (Stories 2–3)
- [x] Cookie helpers and adapters documented via types and consistent naming with spec

---

## What Was Built

**Implementation Date:** 2026-06-17

### Files Created

1. **`lib/dashboard/settings-cookies.ts`**
   - Added dashboard cookie constants, URI-safe value serialization, cookie-header parsing, browser cookie writes, and async server cookie reads via `next/headers`.
2. **`__tests__/lib/dashboard/settings-cookies.test.ts`**
   - Added coverage for encode/decode, cookie attributes, malformed headers, browser writes, and mocked server reads.

### Files Modified

- **`lib/dashboard/workstream-scope.ts`**
  - Added cookie load/save adapters, server cookie scope loading, and one-time localStorage migration while preserving existing Storage helpers.
- **`__tests__/lib/dashboard/workstream-scope.test.ts`**
  - Added cookie adapter and migration coverage, including cookie-wins, invalid legacy payload, and blocked storage paths.

### Implementation Decisions

1. **Shared parsing stays in `workstream-scope.ts`** — Cookie adapters delegate to `parseDashboardWorkstreamScope` so client and server reads cannot drift.
2. **Server import is deferred** — `readServerCookie` dynamically imports `next/headers` only when called from server code.

### Test Results

**Verification:** Focused Story 1 suites passed.
- `pnpm jest __tests__/lib/dashboard/settings-cookies.test.ts __tests__/lib/dashboard/workstream-scope.test.ts --runInBand`

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** Low
- **Boundary Compliance:** Files stayed within Story 1 scope.

### Deviations from Spec

None
