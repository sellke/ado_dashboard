# Update Expired ADO PAT In-App

> **Status:** Complete
> **Created:** 2026-06-15
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue `.writ/issues/features/2026-06-15-update-expired-ado-pat.md`

## Specification Contract

**Deliverable:** Let dashboard operators enter and save a new Azure DevOps PAT when sync or ADO
discovery fails due to credential issues — validated against ADO, persisted securely server-side,
and used immediately by `ado-client` without editing `.env` or restarting the dev server.

**Must Include:** Auth-failure detection distinct from other sync errors, lightweight PAT
validation probe, encrypted persistence, and a remediation UI reachable from the sync error state.

**Hardest Constraint:** `process.env.ADO_PAT` is loaded at process start; runtime `.env` writes do
not refresh in-memory env. The solution must introduce a runtime credential source that
`ado-client` reads on every request (with safe caching), while keeping env vars as bootstrap
for first-run and local development.

### 🎯 Experience Design

- **Entry point:** User clicks **Sync Now** (or opens Workstream Registry ADO pickers) and sees
  an auth-specific error alert with an **Update ADO credentials** action — not a generic
  "Sync failed" dead end.
- **Happy path:** Click **Update ADO credentials** → modal opens showing current org (read-only)
  → paste new PAT → **Save & validate** → brief loading → success toast → modal closes → user
  clicks **Sync Now** again → sync succeeds.
- **Moment of truth:** After saving, the very next sync or ADO discovery call uses the new PAT
  without a server restart.
- **Feedback model:** Inline validation errors in the modal (invalid/expired PAT). Success via
  Mantine toast. Sync retry confirms end-to-end recovery.
- **Error experience:**
  - **Auth failure:** Red alert titled "ADO credentials expired or invalid" with remediation CTA.
  - **Other sync failure:** Existing generic "Sync failed" alert unchanged.
  - **Validation failure:** Modal stays open with "PAT rejected by Azure DevOps — check scope
    and expiration" (no PAT echoed back).
  - **Encryption misconfiguration:** Server error with actionable admin message (missing
    `CREDENTIAL_ENCRYPTION_KEY`).

### 📋 Business Rules

- PAT values must never appear in logs, API responses, or client state — log presence/length only
  (per existing debugging lessons).
- `ADO_ORG` remains env-sourced in v1; displayed read-only in the credentials modal. Org
  editing is out of scope (registry spec owns program-level org in DB later).
- Credential resolution order: (1) encrypted DB record if present, (2) `ADO_PAT` env fallback.
  When user saves a new PAT, DB record is upserted and in-memory cache is invalidated immediately.
- PAT validation uses a lightweight ADO probe (`GET .../_apis/projects?$top=1`) with the
  candidate PAT before persistence.
- Accept PATs that return 200 from the probe; reject 401, 403, and 302 (sign-in redirect).
- No multi-user auth in v1 — any dashboard operator can update credentials (solo local tool).
- Existing `.env` `ADO_PAT` continues to work as bootstrap; saving in-app does not modify `.env`.

### Success Criteria

1. Expired/placeholder PAT triggers auth-specific error with remediation CTA (not generic message).
2. Valid new PAT saved via UI is used on the next sync without server restart.
3. Invalid PAT rejected in modal with clear message; DB/env unchanged.
4. No PAT value in server logs, API JSON, or browser network payloads (only `configured: true/false`).
5. Workstream Registry ADO discovery benefits from updated PAT (same credential source).

### Scope Boundaries

- **Included:** Encrypted DB credential store, `ado-client` refactor, credentials API,
  auth-error classification, PAT update modal wired to sync error state.
- **Excluded:** Runtime `.env` file mutation, `ADO_ORG` editing, PAT rotation scheduling,
  multi-user RBAC, Azure Key Vault integration, OAuth/Entra app auth.

### ⚠️ Technical Concerns

- **Encryption key management:** Requires `CREDENTIAL_ENCRYPTION_KEY` (32-byte hex) in `.env`.
  Document generation command in `.env.example`. Missing key → credentials API returns 503 with
  clear admin message; env bootstrap PAT still works if set.
- **In-process cache:** `ado-client` should cache resolved PAT briefly (or until explicit
  invalidation on save) to avoid DB reads on every WIQL call — invalidate on credential update.
- **Error classification drift:** ADO may return 302 instead of 401 for bad PATs. Classify
  302/401/403 and explicit "Missing ADO_PAT" as auth failures; everything else stays generic.

### 💡 Recommendations

- Implement this spec before or in parallel with `2026-06-11-ado-workstream-registry-config-ui`
  — registry ADO pickers share the same credential dependency.
- Reuse `fetchAdoProjects()` (or a thin `probeAdoConnection(pat)` variant) for validation.
- Add `isAdoAuthError(err)` helper shared by sync route, discovery routes, and dashboard.

### ⚠️ Cross-Spec Overlap

- **2026-06-11-ado-workstream-registry-config-ui** (Not Started) — ADO project/team discovery
  APIs depend on valid PAT from the same `ado-client`. This spec provides the credential
  infrastructure those pickers need when PAT expires. No conflict; natural dependency — ship
  credential store (Story 1–2) before registry discovery UI for best operator experience.

## Detailed Requirements

### Credential Store

- New Prisma model `AdoCredential` (singleton row, `key = "default"`):
  - `encryptedPat` (String) — AES-256-GCM ciphertext (IV + auth tag embedded in stored format)
  - `patHint` (String, optional) — last 4 chars for UI confirmation only
  - `updatedAt`
- New `lib/sync/credentials.ts`:
  - `getResolvedPat(): Promise<string | null>`
  - `savePat(pat: string): Promise<void>` — encrypt and upsert
  - `invalidatePatCache(): void`
  - `isCredentialConfigured(): Promise<boolean>`
- Encryption via Node `crypto` (`createCipheriv` / `createDecipheriv`); key from
  `CREDENTIAL_ENCRYPTION_KEY`.

### ADO Client Integration

- Refactor `getAdoEnv()` in `lib/sync/ado-client.ts` to async `resolveAdoEnv()` reading org
  from env and PAT from credential store.
- Export `probeAdoPat(pat: string, org: string): Promise<ProbeResult>` for validation API.
- Export `isAdoAuthError(error: unknown): boolean` checking `AdoRequestError` status and
  missing-env messages.

### API

- `GET /api/ado/credentials/status` — `{ configured: boolean, org: string, patHint?: string }`
- `POST /api/ado/credentials` — body `{ pat: string }` — validate then save; never echo PAT back
- Structured error codes: `AUTH_REJECTED`, `ENCRYPTION_UNAVAILABLE`, `MISSING_ORG`

### UI

- New `AdoCredentialsModal.tsx` — password input, read-only org, Save & validate, cancel.
- Extend `SyncControl` (or parent) to accept `syncAuthError: boolean` and
  `onUpdateCredentials` callback.
- `DashboardContainer` classifies sync errors via `isAdoAuthError` / API error code and sets
  auth-specific title + CTA.

## Implementation Approach

1. **Story 1 — Credential infrastructure:** Prisma migration, encryption module, async env
   resolution in `ado-client`, cache invalidation hook.
2. **Story 2 — Credentials API:** Status + validate-and-save endpoints with error mapping.
3. **Story 3 — Dashboard UX:** Auth error detection, modal, wire-up to sync and discovery errors.

Test strategy: unit tests for encryption round-trip and `isAdoAuthError`; API tests with mocked
ADO probe; component tests for auth alert CTA and modal validation states.
