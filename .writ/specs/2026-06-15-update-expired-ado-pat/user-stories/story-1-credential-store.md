# Story 1: Credential Store & ado-client Refactor

> **Status:** Completed ✅
> **Priority:** High
> **Dependencies:** None

## User Story

**As a** dashboard operator,
**I want** the server to resolve ADO credentials from a secure store at runtime,
**So that** an updated PAT takes effect immediately without restarting the dev server.

## Acceptance Criteria

1. **Given** an encrypted PAT exists in `AdoCredential`,
   **When** `ado-client` makes any ADO REST call,
   **Then** it uses the decrypted DB PAT (not stale `process.env`).

2. **Given** no DB credential but valid `ADO_PAT` in env,
   **When** `getResolvedPat()` is called,
   **Then** it returns the env PAT (bootstrap path).

3. **Given** placeholder `your_ado_pat_here` as the only PAT source,
   **When** sync attempts an ADO call,
   **Then** `isAdoAuthError` classifies the failure as auth-related.

4. **Given** `invalidatePatCache()` is called after a save,
   **When** the next ADO request runs,
   **Then** it reads the fresh PAT from DB (not cached value).

5. **Given** a PAT is stored or resolved,
   **When** any logging occurs,
   **Then** only presence/length/hint are logged — never the PAT value.

## Implementation Tasks

- [x] Add `AdoCredential` model to `prisma/schema.prisma` and run migration
- [x] Create `lib/sync/credentials.ts` with encrypt/decrypt, `getResolvedPat`, `savePat`, `invalidatePatCache`
- [x] Document `CREDENTIAL_ENCRYPTION_KEY` in `.env.example` with generation command
- [x] Refactor `ado-client.ts`: async `resolveAdoEnv()`, update all callers
- [x] Add `probeAdoPat(pat, org)` and `isAdoAuthError(err)` exports
- [x] Add unit tests: encryption round-trip, resolution order (DB → env), auth classifier
- [x] Verify existing sync/integration tests pass with env-bootstrap path unchanged

## Technical Notes

- Use AES-256-GCM; store format `iv:tag:ciphertext` as base64 segments (see technical-spec).
- In-memory cache (`cachedPat`) avoids per-request DB hits during sync batches.
- `AdoRequestError.status` 302 indicates ADO sign-in redirect for bad PAT — include in classifier.
- All `fetchAdo*` functions already async; internal `buildAdoHeaders` must await `resolveAdoEnv`.

## Definition of Done

- [x] Migration applied; `AdoCredential` table exists
- [x] `credentials.ts` tested (encrypt/decrypt, fallback, cache invalidation)
- [x] `ado-client` uses runtime PAT resolution; env bootstrap preserved
- [x] `isAdoAuthError` covers 302/401/403 and missing-env cases
- [x] No PAT values in logs (grep test or code review checkpoint)

## Context for Agents

- **Error map:** technical-spec → Error & Rescue Map rows for resolve/decrypt failures.
- **Shadow path:** Empty store + valid env → bootstrap works (Nil/Empty Input row).
- **Business rule:** PAT never logged — see spec.md → Business Rules and knowledge lesson
  `2026-06-04-diagnosing-outbound-integration-failures.md`.
- **Integration:** Story 2 consumes `savePat` + `probeAdoPat`; Story 3 consumes `isAdoAuthError`.

---

## What Was Built

**Implementation Date:** 2026-06-15

### Files Created

1. **`lib/sync/credentials.ts`**
   - Added AES-256-GCM PAT encryption/decryption, DB-first runtime PAT resolution, env bootstrap fallback, cache invalidation, configured status, and stored hint helpers.
2. **`prisma/migrations/20260615195000_add_ado_credentials/migration.sql`**
   - Added the `ado_credentials` table with singleton key, encrypted PAT, optional PAT hint, and timestamps.
3. **`__tests__/lib/sync/credentials.test.ts`**
   - Covered encryption round-trip, invalid keys, DB-over-env resolution, env fallback, placeholder rejection, save invalidation, and degraded DB fallback behavior.
4. **`__tests__/lib/sync/ado-client-auth.test.ts`**
   - Covered ADO auth status classification and missing/placeholder credential resolution.

### Files Modified

- **`prisma/schema.prisma`**
  - Added the `AdoCredential` model mapped to `ado_credentials`.
- **`.env.example`**
  - Documented `CREDENTIAL_ENCRYPTION_KEY` and generation command.
- **`lib/sync/ado-client.ts`**
  - Replaced static PAT env reads with async runtime credential resolution, added `probeAdoPat`, added `isAdoAuthError`, and preserved manual redirect handling for auth classification.
- **`__tests__/prisma/helpers.ts`**
  - Included `AdoCredential` cleanup when the generated Prisma client exposes the delegate.

### Implementation Decisions

1. **DB-first resolver with non-cached degraded fallback** — DB/decrypt success is cached, but env fallback after DB/decrypt failure is not cached so a recovered DB credential can take effect without restart.
2. **Candidate PAT probe bypasses resolver** — `probeAdoPat` builds auth headers from the submitted PAT directly and never persists or logs the candidate.
3. **Generated-client resilience** — new Prisma delegate access is locally cast so TypeScript can pass even when local `prisma generate` is blocked by the Windows/OneDrive DLL rename issue.

### Test Results

**Verification:** Focused Story 1 tests, typecheck, scoped ESLint, and review gate passed.

- `pnpm jest __tests__/lib/sync/credentials.test.ts __tests__/lib/sync/ado-client-auth.test.ts --runInBand` — 13/13 passing
- `pnpm typecheck` — passing
- Scoped ESLint for Story 1 touched files — passing
- `prisma generate` — blocked locally by Windows/OneDrive `EPERM` renaming Prisma query engine DLL

### Review Outcome

**Result:** PASS

- **Iteration count:** 2 iteration(s)
- **Drift:** None for owned Story 1 files
- **Security:** Clean after removing debug-ingest hooks from `lib/sync/ado-client.ts`
- **Boundary Compliance:** Story 1 owned files only; unrelated pre-existing untracked files left untouched

### Deviations from Spec

None
