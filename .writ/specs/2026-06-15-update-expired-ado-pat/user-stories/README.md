# User Stories — Update Expired ADO PAT

## Summary

| Story | Title | Status | Tasks | Progress |
|---|---|---|---|---|
| 1 | [Credential store & ado-client](./story-1-credential-store.md) | Completed ✅ | 7 | 7/7 |
| 2 | [Credentials API](./story-2-credentials-api.md) | Completed ✅ | 6 | 6/6 |
| 3 | [PAT update dashboard UX](./story-3-pat-update-ui.md) | Completed ✅ | 7 | 7/7 |

**Total tasks:** 20 across 3 stories

## Dependencies

```
Story 1 (Credential store)
    │
    ├──► Story 2 (Credentials API)
    │         │
    │         └──► Story 3 (Dashboard UX)
    │
    └──► Story 3 (can stub API during UI dev, but ship order is 1 → 2 → 3)
```

- **Story 1** has no dependencies — foundation for runtime PAT resolution.
- **Story 2** depends on Story 1 (`credentials.ts`, `probeAdoPat`, encryption).
- **Story 3** depends on Story 2 (API endpoints) and Story 1 (`isAdoAuthError`, sync `errorCode`).

## Recommended Implementation Order

1. Story 1 — enables all server-side ADO calls to use DB-backed PAT.
2. Story 2 — exposes validate/save/status for the UI.
3. Story 3 — surfaces remediation to operators.

## Related Specs

- `2026-06-11-ado-workstream-registry-config-ui` — benefits from Story 1–2 credential
  infrastructure for ADO discovery pickers.

## Quick Links

- [Story 1: Credential store & ado-client](./story-1-credential-store.md)
- [Story 2: Credentials API](./story-2-credentials-api.md)
- [Story 3: PAT update dashboard UX](./story-3-pat-update-ui.md)
- [Technical spec](../sub-specs/technical-spec.md)
- [Full spec](../spec.md)
