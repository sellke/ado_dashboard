# Technical Spec — Testing State Workstream Metrics

> Parent: `.writ/specs/2026-06-26-testing-state-workstream-metrics/spec.md`
> Traceability: Story 1 (mapping/API), Story 2 (UI/tests)

## Architecture

```
WorkItem (state='Testing', type='UserStory')
  → GET /api/sprints/stories
       → mapStateToStatusGroup('Testing') → 'Testing'
  → mapSprintStoriesResponse()
       → STATUS_GROUP_ORDER filters/groups → Testing section
  → SprintStoryListPanel
       → STATUS_COLOR['Testing'] = 'cyan'
```

No changes to:
- `lib/metrics/types.ts` (`BUG_RESOLVED_STATES`)
- `lib/metrics/trend-service.ts`
- `app/api/milestones/route.ts`

## Type Changes

```typescript
// lib/sprints/status-mapping.ts
export type StatusGroup =
  | 'Planned'
  | 'Active'
  | 'Testing'   // NEW
  | 'Resolved'
  | 'Completed';
```

`StatusGroupViewModel`, `StoryRowViewModel`, and API response types import `StatusGroup` from this module — TypeScript will enforce exhaustiveness in `STATUS_COLOR` once the panel map is updated.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
|---|---|---|---|
| Map ADO state to group | Unknown state string | Return `null`; API route filters out | Unit test: unknown → null |
| Map ADO state to group | `Testing` state | Return `'Testing'` | Unit test: Testing → Testing |
| Sprint stories API query | DB unavailable | Existing 500 error path | Route test with mocked failure (unchanged) |
| Adapter group ordering | Missing STATUS_GROUP_ORDER entry | TypeScript exhaustiveness + order test | Adapter test: 5-group order |
| Panel render | Missing STATUS_COLOR key | TypeScript Record<StatusGroup, string> enforces | Panel test: Testing section renders |

No `[UNPLANNED]` items — all failure modes inherit existing sprint story list behavior.

## Shadow Paths

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
|---|---|---|---|---|
| View sprint with Testing stories | Testing section between Active and Resolved with cyan badge | N/A | No Testing stories → section hidden | Red error text in panel |
| API fetch stories | Testing stories in response with statusGroup Testing | N/A | Empty stories array → empty groups | 500 → panel error prop |
| Bug burndown (unchanged) | Testing bugs counted closed | N/A | No bugs → zero closed | Existing chart error handling |

## Interaction Edge Cases

| Edge Case | Planned Handling |
|---|---|
| Sprint tab switch with Testing stories | Testing section updates per sprint data (existing tab behavior) |
| All stories in Testing state | Only populated groups shown; Testing section visible |
| TypeScript exhaustiveness on STATUS_COLOR | Add Testing entry in same story as type extension |
| Milestone API uses same mapper | Testing returns `'Testing'` but milestone filters only Active/Resolved/Completed — no accidental inclusion |

## Test Matrix

| File | Action |
|------|--------|
| `__tests__/lib/sprints/status-mapping.test.ts` | Create — map all states, verify order |
| `__tests__/app/api/sprints/stories/route.test.ts` | Add Testing work item to mapping test |
| `__tests__/lib/dashboard/sprint-stories-adapter.test.ts` | Update order expectation |
| `__tests__/components/Dashboard/SprintStoryListPanel.test.tsx` | Add Testing group visibility/color test |
| `__tests__/lib/metrics/trend-service.test.ts` | Run unchanged — regression guard |

## Story Traceability

- **Story 1:** `status-mapping.ts`, API route test, new status-mapping unit tests
- **Story 2:** `SprintStoryListPanel.tsx`, adapter test, panel test, regression verification
