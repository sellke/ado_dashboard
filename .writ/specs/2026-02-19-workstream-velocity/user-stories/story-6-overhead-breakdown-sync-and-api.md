# Story 6: Overhead Breakdown Sync & API

> **Status:** Not Started ⬜
> **Priority:** High
> **Dependencies:** Story 1 (API Extension amendment — DB investigation results gate ADO sync scope)

## User Story

**As a** dashboard consumer
**I want to** see a breakdown of overhead hours by category (Meetings, Spikes, Bugs, Support) per workstream per sprint via the API
**So that** the frontend can render an overhead trend chart showing how overhead composition changes across sprints

## Acceptance Criteria

- [ ] Given a workstream sprint in the rolling window, when GET /api/metrics is called, then each trend sprint includes an `overheadBreakdown` array with `{ category, hours }` for each applicable overhead category
- [ ] Given Meetings overhead, when computed per sprint per workstream, then hours = `10.25 × count of active team members` (active = has ADO Capacity entries for that sprint in that workstream)
- [ ] Given Spikes, Bugs, and Support work items, when fetched from the `WorkItem` table, then their hours are summed per category per sprint per workstream and included in `overheadBreakdown`
- [ ] Given overhead categories with zero hours in a sprint, when the response is built, then those categories are included with `hours: 0` (not omitted) to ensure consistent chart series
- [ ] Given ADO work item types for Spikes/Support are not yet synced, when the sync pipeline runs, then they are added to the sync scope and persisted in the `WorkItem` table
- [ ] Given existing API consumers, when the response shape changes, then all existing fields remain unchanged (additive only)

## Implementation Tasks

- [ ] 6.1 Review Story 1 task 1.12 findings — confirm which overhead work item types (Meetings, Spikes, Bugs, Support) exist in the `WorkItem` table and which need ADO sync extension
- [ ] 6.2 Extend the ADO sync pipeline to fetch and persist any missing overhead work item types (likely Spikes and Support) — add them to the work item type filter in the sync service
- [ ] 6.3 Write tests for the overhead breakdown API response shape (`overheadBreakdown` per trend sprint per workstream)
- [ ] 6.4 Add a Prisma query to sum hours for Spikes, Bugs, and Support work items grouped by `(category/type, sprintId, workstreamId)` for the rolling window sprints
- [ ] 6.5 Add ADO Capacity query to count active members per workstream per sprint (members with capacity entries) — compute Meetings hours as `10.25 × memberCount`
- [ ] 6.6 Assemble the `overheadBreakdown` array per sprint: `[{ category: 'Meetings', hours: N }, { category: 'Spikes', hours: N }, { category: 'Bugs', hours: N }, { category: 'Support', hours: N }]` — always include all 4 categories (use 0 if no data)
- [ ] 6.7 Attach `overheadBreakdown` to each trend sprint in the workstream API response
- [ ] 6.8 Update API route tests and verify backward compatibility — all existing fields unchanged

## Notes

- ADO Capacity is already partially synced for gross/overhead hours; the active member count can be derived from distinct team members with non-zero capacity in the relevant sprint and workstream
- `10.25 hours` per member for Meetings should be stored as a named constant (e.g., `MEETING_HOURS_PER_MEMBER_PER_SPRINT = 10.25`) rather than hardcoded inline — makes future adjustment straightforward
- Bug work items are already being fetched for the bug listing (Story 1) — reuse or extend that query to also aggregate bug hours per sprint
- Overhead category type mapping: ADO work item `type` field value → category label (document the exact ADO type names during implementation)
- Keep all 4 categories in every sprint's `overheadBreakdown` array even when hours = 0, so the frontend chart always has consistent series data

## Definition of Done

- [ ] All tasks completed
- [ ] All acceptance criteria met
- [ ] ADO sync extended (or confirmed no extension needed based on DB investigation)
- [ ] API returns `overheadBreakdown` per trend sprint with all 4 categories
- [ ] Tests passing with non-zero fixture data
- [ ] Backward compatibility confirmed — no regressions in existing tests
