# Changelog — ADO Workstream Registry Config UI

## 2026-06-11 — Initial spec (via `/edit-spec`)

- **Change type:** New specification (contract locked from edit-spec discovery)
- **What changed:** Created full spec package to replace hardcoded `SYNC_CONFIG.workstreams` with DB-persisted org → project → team/board mappings, live ADO pickers, full CRUD admin UI, and sync-on-next-run behavior.
- **Origin:** User request to enable configuration of workstreams at board-level within project/organization in ADO.
- **Files created:** `spec.md`, `spec-lite.md`, `sub-specs/*`, `user-stories/*`
- **Backup:** N/A (new spec; no prior version)
