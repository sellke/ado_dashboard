# Story 2 — ADO discovery API

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a **dashboard operator**, I want **API endpoints that list ADO projects and teams**, so that
**the registry UI can offer live pickers instead of manual GUID entry**.

## Acceptance Criteria

1. **Given** valid `ADO_ORG` and `ADO_PAT`, **when** I `GET /api/ado/projects`, **then** I
   receive a list of projects the PAT can access.
2. **Given** a valid project, **when** I `GET /api/ado/teams?project=...`, **then** I receive
   teams with `id` and `name` suitable for workstream mapping.
3. **Given** ADO returns 401/403, **when** discovery is called, **then** the API returns 503
   with a recoverable error message (no partial fake data).

## Implementation Tasks

- [ ] Write API tests with mocked ADO responses (projects, teams, auth failure)
- [ ] Add `fetchAdoProjects()` and `fetchAdoTeams(project)` to `lib/sync/ado-client.ts`
- [ ] Implement `GET /api/ado/projects/route.ts`
- [ ] Implement `GET /api/ado/teams/route.ts`
- [ ] Add shared ADO error mapping consistent with existing sync routes
- [ ] Document env requirements in route comments (ADO_ORG, ADO_PAT)

## Technical Notes

See `sub-specs/api-spec.md` and `sub-specs/technical-spec.md`. Reuse `getAdoEnv()` and
`adoFetch()` from `ado-client.ts`. Do not cache across requests in v1 unless latency requires it.

## Definition of Done

- [ ] Both discovery endpoints return expected shapes in tests
- [ ] Auth/network failures handled per Error & Rescue Map
- [ ] ≥80% coverage on new client + route code

## Context for Agents

- Existing pattern: `fetchTeamIterations(project, team)` URL structure in `ado-client.ts`.
- Projects API: `/_apis/projects?api-version=7.0`
- Teams API: `/_apis/projects/{project}/teams?api-version=7.0`
