# Add Testing State to Workstream Story Metrics

> **Status:** Complete
> **Created:** 2026-06-26
> **Owner:** @AdamSellke
> **Origin:** Promoted from issue: `.writ/issues/features/2026-06-26-testing-state-workstream-metrics.md`

## Contract Summary

**Deliverable:** Surface User Stories in ADO `Testing` state as their own status group in workstream sprint story metrics, ordered between Active and Resolved.

**Must Include:** Testing stories visible in sprint story lists with correct grouping, ordering, counts, and badge colors — without changing bug metrics or milestone breakdown behavior.

**Hardest Constraint:** `Testing` already means "closed" for bugs (`BUG_RESOLVED_STATES`) but must mean a distinct in-sprint progress stage for User Stories — the mapping change must not leak into bug burndown or trend calculations.

**Success Criteria:**

- User Stories in ADO `Testing` state appear in workstream sprint story lists
- Display order: Planned → Active → **Testing** → Resolved → Completed
- Section headers and count badges reflect the Testing group
- Empty Testing groups remain hidden (existing behavior)
- Bug metrics (`BUG_RESOLVED_STATES`, burndown charts) unchanged
- Milestone workstream breakdown unchanged (Testing stories still excluded there)

**Scope Boundaries:**

- **Included:** `status-mapping.ts`, sprint stories API mapping, adapter ordering, `SprintStoryListPanel` color/label, related unit/integration tests
- **Excluded:** Milestone progress reclassification, bug metrics, PowerPoint export, new API endpoints, non-UserStory work item types

## Experience Design

### Entry Point

Dashboard viewer opens a workstream health card and selects a sprint tab in the **Sprint Stories** panel below the velocity chart.

### Happy Path

1. User selects a sprint tab that contains stories in ADO `Testing` state.
2. Panel renders status sections in lifecycle order: Planned → Active → Testing → Resolved → Completed.
3. Testing section shows a distinct color, group label "Testing", and a count badge matching the number of stories in that state.
4. Each story row continues to show ADO ID, title, assignee, story points badge (colored by status group), and ADO deep link.

### Moment of Truth

Stories that were previously invisible (ADO `Testing` state) now appear in a dedicated section between Active and Resolved — giving an accurate picture of work in QA without conflating it with fully resolved or still-active development.

### Feedback Model

No new toasts or modals. Success is visible inline: the Testing section appears with correct stories and counts when data exists.

### Error Experience

No new error states. Existing panel behaviors apply:

- **Loading:** Skeleton placeholders (unchanged)
- **API error:** Red error text (unchanged)
- **No sprint data:** "No sprint data available" (unchanged)
- **Sprint with no stories:** Empty status groups hidden; no Testing section shown
- **Unknown/Removed ADO states:** Still excluded from lists (unchanged)

### State Catalog

| State | User sees |
|-------|-----------|
| Loading | Skeleton panel |
| Populated with Testing stories | Testing section between Active and Resolved |
| Populated without Testing stories | No Testing section (hidden empty group) |
| Error | Existing error message |

### Visual Treatment

| Display Group | ADO States | Mantine Badge Color | Rationale |
|---------------|------------|---------------------|-----------|
| Planned | New, Approved, Committed | `gray` | Unchanged |
| Active | Active | `blue` | Unchanged |
| **Testing** | **Testing** | **`cyan`** | Distinct from Active (blue) and Resolved (yellow); suggests QA without RYG status semantics |
| Resolved | Resolved | `yellow` | Unchanged |
| Completed | Closed | `green` | Unchanged |

## Business Rules

1. **User Story scope only:** The new `Testing` status group applies to User Story sprint lists via `mapStateToStatusGroup()`. Bug closed-state logic uses `BUG_RESOLVED_STATES` separately and is not modified.
2. **Lifecycle ordering:** `STATUS_GROUP_ORDER` must be `['Planned', 'Active', 'Testing', 'Resolved', 'Completed']`.
3. **Empty groups hidden:** Sections with zero stories are omitted from the view model and UI (existing adapter/panel behavior).
4. **Excluded states unchanged:** `Removed` and unknown ADO states continue to return `null` from `mapStateToStatusGroup()` and are filtered out by the API route.
5. **Milestones out of scope:** `app/api/milestones/route.ts` workstream breakdown continues to classify only Active as in-progress and Resolved/Completed as completed. Testing stories remain excluded from milestone counts until a future spec addresses that.

## Detailed Requirements

### Status Mapping Change

Extend `lib/sprints/status-mapping.ts`:

```typescript
export type StatusGroup = 'Planned' | 'Active' | 'Testing' | 'Resolved' | 'Completed';

const STATUS_MAP: Record<string, StatusGroup> = {
  // ...existing...
  Testing: 'Testing',
};

export const STATUS_GROUP_ORDER: StatusGroup[] = [
  'Planned', 'Active', 'Testing', 'Resolved', 'Completed',
];
```

### Downstream Consumers

| File | Change |
|------|--------|
| `app/api/sprints/stories/route.ts` | Picks up mapping automatically — includes Testing stories in response |
| `lib/dashboard/sprint-stories-adapter.ts` | Picks up `STATUS_GROUP_ORDER` automatically — Testing group ordered correctly |
| `components/Dashboard/SprintStoryListPanel.tsx` | Add `Testing: 'cyan'` to `STATUS_COLOR` |
| `lib/dashboard/types.ts` | `StatusGroup` type flows from status-mapping — no manual duplicate |
| `app/api/milestones/route.ts` | **No change** |

### Tests to Update or Add

| Test file | Expected change |
|-----------|-----------------|
| `__tests__/lib/sprints/status-mapping.test.ts` | **New** — map Testing state, verify order constant |
| `__tests__/app/api/sprints/stories/route.test.ts` | Add Testing state to status group mapping test |
| `__tests__/lib/dashboard/sprint-stories-adapter.test.ts` | Update ordering assertion to include Testing |
| `__tests__/components/Dashboard/SprintStoryListPanel.test.tsx` | Add Testing group rendering/color test |

### Regression Guardrails

- `__tests__/lib/metrics/trend-service.test.ts` — bug Testing-as-closed tests must still pass unchanged
- `__tests__/components/Dashboard/BugBurndownChart.test.tsx` — unchanged
- Milestone route tests (if any assert status group counts) — unchanged behavior for Testing

## Implementation Approach

Single shared status mapping module already exists. This is a type extension plus one map entry plus UI color — low risk, high traceability.

**Recommended story split:**

1. **Story 1:** Status mapping layer + API route verification + unit tests
2. **Story 2:** UI color/label + adapter/panel test updates + regression verification

No database migration. No new API shape fields — `statusGroup` enum value expands to include `Testing`.

## Cross-Spec Relationship

Extends the sprint story list feature from `.writ/specs/2026-03-05-sprint-story-list-tabs/` (Complete). That spec defined the original four-group model; this spec adds a fifth group without changing panel architecture.
