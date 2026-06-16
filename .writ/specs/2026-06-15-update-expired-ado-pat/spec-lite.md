# Update Expired ADO PAT In-App (Lite)

> Source: .writ/specs/2026-06-15-update-expired-ado-pat/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Encrypted DB PAT store + credentials API + dashboard modal so operators fix
expired ADO auth without `.env` edits or server restart.

**Implementation Approach:**
- `AdoCredential` Prisma singleton; AES-256-GCM via `CREDENTIAL_ENCRYPTION_KEY`.
- `lib/sync/credentials.ts` — resolve PAT (DB → env fallback), save, cache invalidate.
- Async `resolveAdoEnv()` in `ado-client.ts`; `probeAdoPat()` for validation.
- `isAdoAuthError()` — 302/401/403 + missing PAT messages.
- APIs: `GET/POST /api/ado/credentials` (+ `/status` or combined GET).
- `AdoCredentialsModal.tsx`; extend `SyncControl` with auth CTA.

**Files in Scope:**
- `prisma/schema.prisma` — `AdoCredential` model
- `lib/sync/credentials.ts` — new
- `lib/sync/ado-client.ts` — async env resolution, probe, auth classifier
- `app/api/ado/credentials/route.ts` — new
- `components/Dashboard/AdoCredentialsModal.tsx` — new
- `components/Dashboard/SyncControl.tsx`, `DashboardContainer.tsx`
- `.env.example` — `CREDENTIAL_ENCRYPTION_KEY`

**Error Handling:**
- Invalid PAT on save → 422 `AUTH_REJECTED`, modal inline error
- Missing encryption key → 503 `ENCRYPTION_UNAVAILABLE`
- Non-auth sync errors → existing generic alert unchanged

**Integration Points:**
- Registry spec `app/api/ado/projects` uses same `ado-client` credential source
- Sync route benefits automatically after `ado-client` refactor

---

## For Review Agents

**Acceptance Criteria:**
1. Save valid PAT → next sync succeeds without restart.
2. Auth failure shows distinct alert + "Update ADO credentials" CTA.
3. Invalid PAT rejected; no PAT in logs/API responses.
4. Env `ADO_PAT` still works when DB empty (bootstrap).

**Business Rules:**
- PAT never logged (presence/length only).
- `ADO_ORG` read-only, env-sourced in v1.
- Resolution: DB record → env fallback.
- Saving does not mutate `.env`.

**Experience Design:**
- Entry: auth error on Sync Now or ADO discovery failure.
- Happy path: CTA → modal → paste PAT → validate → toast → retry sync.
- Moment of truth: immediate use of new PAT on next request.
- Feedback: toast on success; inline modal error on rejection.
- Error: distinguish auth vs transport vs sync logic failures.

---

## For Testing Agents

**Success Criteria:**
1. Encryption round-trip unit tests pass.
2. `isAdoAuthError` covers 302/401/403 and missing-env cases.
3. API + modal component coverage ≥80%; auth classifier 100%.

**Shadow Paths:**
- **Happy path:** update PAT → sync succeeds.
- **Nil input:** empty PAT field → 422 client validation.
- **Empty store:** no DB/env PAT → auth error with CTA.
- **Upstream error:** ADO 503 on probe → retry message, no save.

**Edge Cases:**
- Placeholder `your_ado_pat_here` → treated as auth failure.
- Double-click Save → debounce/disable button.
- Save while sync in-flight → modal independent; cache invalidates on save.

**Test Strategy:**
- Unit: `credentials.ts`, `isAdoAuthError`, encryption.
- API: POST validate/save mocks, GET status never returns PAT.
- Component: auth alert CTA, modal validation states.
