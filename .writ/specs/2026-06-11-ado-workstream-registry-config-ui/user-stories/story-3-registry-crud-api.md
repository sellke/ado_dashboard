# Story 3 — Workstream registry CRUD API

> **Status:** Not Started
> **Priority:** High
> **Dependencies:** Story 1

## User Story

As a **dashboard operator**, I want **API endpoints to create, update, and remove workstream
mappings**, so that **the admin UI can persist registry changes with validation and safe delete
guards**.

## Acceptance Criteria

1. **Given** valid payload, **when** I `POST /api/workstreams`, **then** a workstream row is
   created with all required ADO mapping fields.
2. **Given** a workstream with synced work items, **when** I `DELETE /api/workstreams/[id]`,
   **then** I receive 409 with related counts; no row deleted.
3. **Given** delete is blocked, **when** I `PATCH .../sync-enabled` with `false`, **then** the
   workstream is excluded from future sync without data loss.
4. **Given** duplicate workstream name, **when** I POST, **then** 422 with field error.

## Implementation Tasks

- [ ] Write API tests: CRUD happy paths, 409 delete guard, 422 validation, GET backward compat
- [ ] Add `lib/sync/workstream-validation.ts` (pure validators) + unit tests
- [ ] Extend `GET /api/workstreams` with admin fields; preserve scope-modal compatibility
- [ ] Implement `POST /api/workstreams/route.ts`
- [ ] Implement `PUT /api/workstreams/[id]/route.ts`
- [ ] Implement `DELETE /api/workstreams/[id]/route.ts` with FK check
- [ ] Implement `PATCH /api/workstreams/[id]/sync-enabled/route.ts`
- [ ] Implement `GET/PUT /api/sync-config` for program settings

## Technical Notes

See `sub-specs/api-spec.md`. DELETE must count related entities across all Workstream FKs.
422 body: `{ errors: [{ field, message }] }`.

## Definition of Done

- [ ] All registry + sync-config endpoints implemented and tested
- [ ] GET /api/workstreams still works for WorkstreamScopeModal
- [ ] Validators 100% covered; API ≥80%

## Context for Agents

- Existing GET: `app/api/workstreams/route.ts` — extend, don't break `{ id, name, adoAreaPath }`.
- FK relations on Workstream: see `prisma/schema.prisma` (workItems, metricSnapshots, etc.).
