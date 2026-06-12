# ADO Workstream Registry Config UI (Lite)

> Source: .writ/specs/2026-06-11-ado-workstream-registry-config-ui/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** DB-persisted workstream registry (org → project → ADO team + area path) with
full CRUD admin UI, live ADO pickers, sync reads DB on next Sync Now. Defaults = today's
`SYNC_CONFIG`.

**Implementation Approach:**
- Extend `Workstream` with `adoOrg`, `adoProject`, `adoTeamId`, `syncEnabled`.
- Add `SyncProgramConfig` singleton: `adoProject`, `iterationTeamId`, `lookbackSprintCount`.
- Seed from `lib/sync/config.ts` + `prisma/seed.ts`; remove hardcoded `workstreams` array.
- ADO client: `fetchProjects()`, `fetchTeams(project)` via REST (org from env/PAT).
- Registry APIs under `app/api/workstreams/` + discovery under `app/api/ado/`.
- Admin UI: `WorkstreamRegistryPanel.tsx` with cascade Project → Team pickers.

**Files in Scope:**
- `prisma/schema.prisma`, `prisma/seed.ts`
- `lib/sync/config.ts` — program defaults only (or delete workstreams array)
- `lib/sync/orchestrator.ts`, `capacity.ts`, `ado-client.ts`
- `app/api/workstreams/route.ts` — extend GET; add POST/PUT/DELETE
- `app/api/ado/projects/route.ts`, `app/api/ado/teams/route.ts`
- `components/Dashboard/WorkstreamRegistryPanel.tsx`

**Error Handling:**
- Delete with FK data → 409 + disable-sync alternative
- ADO discovery failure → recoverable panel error
- Invalid team/area on save → 422 field errors

**Integration Points:**
- `GET /api/workstreams` used by scope modal — preserve `{ id, name, adoAreaPath }`
- Settings entry: coordinate with metric-config + scope modals

---

## For Review Agents

**Acceptance Criteria:**
1. Default seed syncs same 5 workstreams as pre-feature hardcoded config.
2. Add workstream via UI + next sync ingests ADO data without code change.
3. `SYNC_CONFIG.workstreams` removed; sync is DB-driven.
4. Delete blocked when synced data exists; disable-sync works.

**Business Rules:**
- Full area path stored on Workstream (not suffix-only).
- Changes apply on next Sync Now only.
- Dashboard include/exclude scope unchanged (browser-local).
- Org defaults from `ADO_ORG`; no multi-org UI in v1.

**Experience Design:**
- Entry: Workstream Registry in dashboard settings.
- Happy path: Add/Edit → pick project → pick team → save area path → toast.
- Moment of truth: next sync populates new board data.
- Error: ADO list failure recoverable; delete guarded with disable option.

---

## For Testing Agents

**Success Criteria:**
1. Seed regression: DB rows match SYNC_CONFIG constants.
2. Sync regression: default registry produces same sync targets as before.
3. CRUD API + discovery API coverage ≥80%; delete-guard 100%.

**Shadow Paths:**
- **Happy path:** add workstream → sync → appears in API + dashboard.
- **Nil input:** no custom rows → seeded defaults used.
- **Delete with data:** 409, syncEnabled=false excludes from sync.
- **ADO unreachable:** discovery 503, registry unchanged.

**Edge Cases:**
- Duplicate name → 422. Invalid team GUID → 422 on save test call.
- Disabled workstream skipped by sync but visible in registry (greyed out).

**Test Strategy:**
- Unit: seed mapping, validators, config loader.
- API: CRUD, discovery mocks, delete guard.
- Integration: orchestrator reads DB workstreams.
