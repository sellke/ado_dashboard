# Story 4 — Registry admin UI

> **Status:** Not Started
> **Priority:** Medium
> **Dependencies:** Stories 2 and 3

## User Story

As a **dashboard operator**, I want **a Workstream Registry panel to add, edit, and remove ADO
board mappings with live pickers**, so that **I can configure sync sources without editing code**.

## Acceptance Criteria

1. **Given** I'm on the dashboard, **when** I open Workstream Registry, **then** I see all
   workstreams with project, team, area path, and enabled status.
2. **Given** I click Add, **when** I select Project then Team from live lists and Save, **then**
   the workstream persists and a success toast appears.
3. **Given** delete returns 409, **when** the UI handles it, **then** I am offered Disable sync
   with a clear explanation.
4. **Given** ADO discovery fails, **when** the form loads, **then** a recoverable error appears
   with retry; existing registry data is unchanged.

## Implementation Tasks

- [ ] Write component tests: list, add, edit, delete blocked → disable, discovery error
- [ ] Add `WorkstreamRegistryPanel.tsx` (Mantine modal/drawer + table + form)
- [ ] Wire Project → Team cascade to discovery APIs
- [ ] Wire Save to POST/PUT registry APIs; Delete to DELETE + disable fallback
- [ ] Add Settings entry point (coordinate with scope + metric config actions)
- [ ] Show note: "Changes apply on next Sync Now"

## Technical Notes

See `sub-specs/technical-spec.md` → UI. Reuse Mantine patterns from `WorkstreamScopeModal.tsx`.
Area path field: pre-fill suggestion when team selected if API provides hint; always editable.

## Definition of Done

- [ ] Full CRUD flows work against real APIs in dev
- [ ] Discovery error + delete guard UX match acceptance criteria
- [ ] ≥80% component test coverage

## Context for Agents

- Reference UI: `components/Dashboard/WorkstreamScopeModal.tsx` (modal patterns, not scope logic).
- Do not conflate with browser-local scope — label clearly: "Registry" vs "Dashboard scope".
- spec.md → Experience Design → entry point coordination with other settings surfaces.
