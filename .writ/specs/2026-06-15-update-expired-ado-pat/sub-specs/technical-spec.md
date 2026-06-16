# Technical Specification — Update Expired ADO PAT

> Parent: `.writ/specs/2026-06-15-update-expired-ado-pat/spec.md`
> Stories: 1 (store), 2 (API), 3 (UI)

## Architecture

```
DashboardContainer
  ├─ SyncControl (auth alert + CTA)
  └─ AdoCredentialsModal
        │
        ▼ POST /api/ado/credentials
              ├─ probeAdoPat(pat, org)
              └─ credentials.savePat(pat)
                        │
                        ▼
              AdoCredential (encrypted DB)
                        │
                        ▼
              ado-client.resolveAdoEnv()
                (cache → DB → env fallback)
```

## Database Schema

Add to `prisma/schema.prisma`:

```prisma
model AdoCredential {
  id           String   @id @default(cuid())
  key          String   @unique @default("default")
  encryptedPat String
  patHint      String?  // last 4 chars only
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("ado_credentials")
}
```

Migration name suggestion: `add_ado_credentials`.

## Encryption

| Item | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key source | `CREDENTIAL_ENCRYPTION_KEY` env (64 hex chars = 32 bytes) |
| Stored format | `base64(iv):base64(authTag):base64(ciphertext)` |
| IV length | 12 bytes random per encrypt |

Generate key (document in `.env.example`):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Credential Resolution

```typescript
// lib/sync/credentials.ts (conceptual)
let cachedPat: string | null | undefined; // undefined = not loaded

export async function getResolvedPat(): Promise<string | null> {
  if (cachedPat !== undefined) return cachedPat;
  const row = await prisma.adoCredential.findUnique({ where: { key: 'default' } });
  if (row) {
    cachedPat = decrypt(row.encryptedPat);
    return cachedPat;
  }
  const envPat = process.env.ADO_PAT?.trim();
  if (envPat && envPat !== 'your_ado_pat_here') {
    cachedPat = envPat;
    return cachedPat;
  }
  cachedPat = null;
  return null;
}

export function invalidatePatCache(): void {
  cachedPat = undefined;
}
```

## ADO Client Changes

- Replace sync `getAdoEnv()` with `async resolveAdoEnv(): Promise<{ org: string; pat: string }>`.
- All public fetch functions become async-aware for env resolution (already async).
- Add `probeAdoPat(pat: string, org: string): Promise<{ ok: true } | { ok: false; status: number }>`.
- Add `isAdoAuthError(err: unknown): boolean`:
  - `AdoRequestError` with status 302, 401, or 403
  - `Error` message matching `/Missing ADO_PAT|Missing ADO_ORG|credentials/i`
  - Placeholder PAT detected before request

## API Specification

### GET `/api/ado/credentials`

Response `200`:

```json
{
  "configured": true,
  "org": "Operations-Innovation",
  "patHint": "…x4ab"
}
```

Never include full PAT. `configured: false` when neither DB nor valid env PAT exists.

### POST `/api/ado/credentials`

Request:

```json
{ "pat": "xxxxxxxxxxxxxxxxxxxxxxxx" }
```

Validation:
- `pat` required, trimmed, min length 20 (ADO PATs are 52 chars; allow margin).
- `ADO_ORG` must be set in env.

Flow:
1. Probe ADO with candidate PAT.
2. On 200 → encrypt, upsert `AdoCredential`, set `patHint`, `invalidatePatCache()`.
3. Return `200 { success: true, configured: true, patHint }`.

Error responses:

| Status | Code | When |
|---|---|---|
| 422 | `AUTH_REJECTED` | Probe returns 302/401/403 |
| 422 | `VALIDATION_ERROR` | Missing/short PAT |
| 503 | `ENCRYPTION_UNAVAILABLE` | No `CREDENTIAL_ENCRYPTION_KEY` |
| 503 | `MISSING_ORG` | `ADO_ORG` not set |

## Auth Error Classification in Sync

In `app/api/sync/ado/route.ts` (or orchestrator), when sync fails:

- If root cause is auth → include `errorCode: 'ADO_AUTH_FAILURE'` in JSON response.
- Dashboard checks `errorCode` or parses message via `isAdoAuthError`.

Suggested sync response shape (additive, backward compatible):

```json
{
  "success": false,
  "error": "ADO credentials expired or invalid.",
  "errorCode": "ADO_AUTH_FAILURE"
}
```

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Resolve PAT from DB | DB unavailable | Fall back to env PAT; if both fail, auth error | Mock prisma throw |
| Decrypt stored PAT | Wrong/missing encryption key | 503 on save; env fallback on read if decrypt fails | Unit: bad key |
| Probe ADO (validate) | 302/401/403 | 422 AUTH_REJECTED, no save | Mock adoFetch statuses |
| Probe ADO (validate) | TLS/network error | 503 with retry message | Mock network throw |
| Save encrypted PAT | DB write fails | 500, cache not invalidated | Mock prisma upsert fail |
| Sync with expired PAT | ADO 302 redirect | `ADO_AUTH_FAILURE` + UI CTA | Integration mock |
| GET credentials status | DB unavailable | 503 or `configured` from env only | API test |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Update PAT | Modal → valid PAT → toast → sync works | Empty field → inline "PAT required" | No stored PAT → status `configured: false`, CTA shown | ADO probe 503 → "Could not reach Azure DevOps" |
| Sync after update | Sync succeeds | N/A | No PAT anywhere → auth alert + CTA | TLS error → generic sync failed (not auth) |
| Bootstrap (env only) | Env PAT works, `configured: true` | N/A | Placeholder env → auth failure | N/A |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Double-click Save | Disable button after first click until response |
| Save during active sync | Allowed; cache invalidates; in-flight sync may still fail — user retries |
| Paste whitespace PAT | Trim before validate |
| Very long PAT string | Reject > 200 chars client + server |
| Encryption key rotated | Old ciphertext fails decrypt → treat as unconfigured, prompt re-entry |

## Environment Variables

Add to `.env.example`:

```
# 32-byte hex key for encrypting ADO PAT at rest (generate with node crypto command)
CREDENTIAL_ENCRYPTION_KEY=""

# Existing — still used for org and bootstrap PAT
ADO_ORG="Operations-Innovation"
ADO_PAT="your_ado_pat_here"
```

## Traceability

| Component | Story |
|---|---|
| `AdoCredential` + `credentials.ts` | Story 1 |
| `ado-client` refactor + `isAdoAuthError` | Story 1 |
| `/api/ado/credentials` | Story 2 |
| `AdoCredentialsModal` + `SyncControl` | Story 3 |
