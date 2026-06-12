# Technical Spec — ADO Workstream Registry Config UI

> Parent: ../spec.md
> Companions: database-schema.md, api-spec.md

## Guiding principle: sync reads DB, seed guarantees zero drift

Today `ensureConfiguredWorkstreams()` in `orchestrator.ts` upserts from `SYNC_CONFIG.workstreams`.
After this spec, sync loads **enabled** workstreams from Prisma and program settings from
`SyncProgramConfig`. Seed + migration must produce identical rows to today's hardcoded config.

## ADO client extensions (`lib/sync/ado-client.ts`)

Add REST helpers (same auth pattern as `fetchTeamIterations`):

```ts
export async function fetchAdoProjects(): Promise<AdoProject[]>
export async function fetchAdoTeams(project: string): Promise<AdoTeam[]>
```

Endpoints:
- `GET https://dev.azure.com/{org}/_apis/projects?api-version=7.0`
- `GET https://dev.azure.com/{org}/_apis/projects/{project}/teams?api-version=7.0`

Optional area-path hint: team settings or project default area classification API.

## Config loader (`lib/sync/sync-config-loader.ts`)

```ts
export async function loadSyncProgramConfig(db): Promise<SyncProgramConfigInput>
export async function loadSyncWorkstreams(db): Promise<WorkstreamSyncTarget[]>
```

- `WorkstreamSyncTarget`: `{ id, name, adoAreaPath, adoOrg, adoProject, adoTeamId }`
- Filters `syncEnabled: true`, orders by `name`
- Used by orchestrator, capacity sync, and tests

## Orchestrator refactor

Replace:
- `SYNC_CONFIG.projectNameOrId` → `programConfig.adoProject`
- `SYNC_CONFIG.iterationTeamId` → `programConfig.iterationTeamId`
- `SYNC_CONFIG.lookbackSprintCount` → `programConfig.lookbackSprintCount`
- `ensureConfiguredWorkstreams()` from hardcoded array → load from DB (seed ensures rows exist)
- Remove `buildAdoAreaPath()` suffix builder — use stored `adoAreaPath`

Pass `adoProject` and `adoTeamId` into capacity and iteration fetchers per workstream where
team-specific calls are needed.

## UI (`components/Dashboard/`)

- `WorkstreamRegistryPanel.tsx` — Mantine modal/drawer:
  - Table of workstreams (name, project, team name, area path, enabled badge)
  - Add / Edit form with Project dropdown → Team dropdown (live fetch) → Area path text input
  - Delete with confirm; on 409 show Disable sync action
  - Link/note: "Changes apply on next Sync Now"
- Entry point: Settings menu alongside Workstream Scope and Metric Configuration

## Backward compatibility

- `GET /api/workstreams` must keep working for `WorkstreamScopeModal` — return at minimum
  `{ id, name, adoAreaPath }` for enabled workstreams.
- `lib/dashboard/config.ts` static defaults remain fallback when no local scope preference;
  they reference workstream **names** — ensure seeded names unchanged.

## Testing strategy

- **Seed regression:** assert DB rows match SYNC_CONFIG constants after migrate + seed.
- **Sync regression:** mock ADO; run orchestrator with default DB; same workstream IDs targeted.
- **CRUD API:** create, update, delete guard, disable sync.
- **Discovery API:** mock ADO responses; error paths.
- **Component:** registry panel add/edit/delete/disable flows.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Area path stored wrong → empty WIQL results | Validate non-empty; optional ADO WIQL probe on save |
| Delete breaks FK | 409 guard + syncEnabled disable path |
| Two settings surfaces confuse users | Group under Settings; clear labels (Registry vs Scope) |
| ADO team list slow | Cache teams per project for session; loading skeleton in UI |
