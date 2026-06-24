# Technical Spec: Cookie-Persisted Dashboard Settings

> **Spec:** `.writ/specs/2026-06-17-cookie-persisted-settings/spec.md`
> **Stories:** 1–4 in `user-stories/`

## Architecture

```
┌─────────────────────┐     read cookies()      ┌──────────────────────┐
│ app/dashboard/      │ ────────────────────────▶│ DashboardContainer   │
│ page.tsx (SSR)      │   initialScopeIds prop   │ (client)             │
└─────────────────────┘                          └──────────┬───────────┘
                                                             │
                    ┌────────────────────────────────────────┼────────────────────────┐
                    │                                        │                        │
                    ▼                                        ▼                        ▼
         settings-cookies.ts                    workstream-scope.ts          WorkstreamScopeModal
         (encode/decode/attrs)                  (parse/save/migrate)         (Save → set cookie)
                    │                                        │
                    ▼                                        ▼
              document.cookie                          localStorage (migrate once, then remove)
              (client write)                           (legacy, client-only)
```

## Cookie Contract

| Property | Value |
|---|---|
| Name pattern | `dashboardWorkstreamScope:v1:{dashboardId}` |
| Value | URL-encoded JSON: `{ includedWorkstreamIds: string[], updatedAt: string }` |
| Path | `/` |
| SameSite | `Lax` |
| Max-Age | `31536000` (365 days) |
| Secure | `true` when `process.env.NODE_ENV === 'production'` |
| HttpOnly | `false` (client modal writes) |

## Module Responsibilities

### `lib/dashboard/settings-cookies.ts`

- Cookie attribute constants and builder for `Set-Cookie`-style client strings.
- `serializeCookieValue(value: string): string` — encode for `document.cookie`.
- `parseCookieHeader(header: string, name: string): string | null` — extract named cookie.
- `setClientCookie(name, value, options?)` — browser write.
- `readServerCookie(name): Promise<string | null>` — async wrapper for `cookies().get(name)`.

Must be importable from server components without pulling client-only APIs into server bundle. Split server read into a function that only imports `next/headers` when called from server context, or use separate server/client entry points if tree-shaking is insufficient.

### `lib/dashboard/workstream-scope.ts` (extensions)

- `loadDashboardWorkstreamScopeFromCookies(cookieHeaderOrGetter, dashboardId)` — uses existing `parseDashboardWorkstreamScope`.
- `saveDashboardWorkstreamScopeToCookie(dashboardId, ids, updatedAt?)` — validates then writes via `setClientCookie`.
- `migrateLocalStorageScopeToCookie(storage, dashboardId)` — returns migrated IDs or null; clears localStorage on success.

Existing functions (`resolveDashboardWorkstreamScope`, query param helpers) unchanged.

### `DashboardContainer` changes

New prop: `initialScopeIds?: string[] | null`

Mount sequence:

1. Initialize `storedScopeIds` from `initialScopeIds` if provided, else null (defer client read).
2. On mount: run migration, then read cookie if no SSR prop was provided.
3. On Save: write cookie instead of localStorage.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Parse cookie value | Malformed JSON, empty IDs | Return null; fall back to defaults | Unit test malformed payloads |
| Read server cookie | Missing cookie | Pass null as initialScopeIds | Page/component test |
| Write client cookie | document.cookie blocked (privacy mode) | Scope stays in memory; no toast | Mock setClientCookie throw |
| Migrate localStorage | localStorage blocked | Skip migration; use defaults | Unit test storage throw |
| Migrate localStorage | Invalid localStorage payload | Ignore; do not write cookie | Unit test bad JSON |
| SSR cookie read | cookies() unavailable in test | Mock next/headers | Jest mock |
| Encode cookie value | Special chars in JSON | URI-encode value | Unit test round-trip |

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| Save workstream scope | Cookie set; reload restores scope | N/A (Save requires selection) | Save blocked (existing rule) | N/A |
| Load on page visit | Cookie → SSR prop → scoped fetch | No cookie → defaults | Empty IDs in cookie → null parse → defaults | Workstream API error → reconciliation deferred (unchanged) |
| Migrate from localStorage | localStorage → cookie → key removed | No localStorage → no-op | Invalid localStorage → no cookie written | localStorage blocked → skip migration |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Cookie and localStorage both present | Cookie wins; migration does not overwrite |
| User saves scope before migration runs | Cookie written; migration finds cookie, skips localStorage |
| SSR prop and client cookie differ | SSR prop used for initial state; client Save overwrites cookie |
| Dashboard ID switch (main ↔ streams) | Separate cookies per dashboard ID |
| Rapid Save clicks | Existing modal behavior; last Save wins |

## Traceability

| Story | Primary modules |
|---|---|
| Story 1 | `settings-cookies.ts`, `workstream-scope.ts` cookie adapters |
| Story 2 | `DashboardContainer.tsx`, migration on mount |
| Story 3 | `app/dashboard/page.tsx`, `app/dashboard/streams/page.tsx` |
| Story 4 | All test files, cross-story regression |

## Out of Scope

- API routes reading cookies for default `workstreamIds` — client always sends explicit params.
- HttpOnly server-set cookies — would require API route or server action for every Save.
- Additional settings keys beyond workstream scope.
