# Testing State Workstream Metrics (Lite)

> Source: .writ/specs/2026-06-26-testing-state-workstream-metrics/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Add `Testing` as a fifth User Story status group in sprint story lists, ordered between Active and Resolved.

**Implementation Approach:**
- Extend `StatusGroup` type and `STATUS_MAP` in `lib/sprints/status-mapping.ts`
- Update `STATUS_GROUP_ORDER` to include `Testing` after `Active`
- Add `Testing: 'cyan'` to `STATUS_COLOR` in `SprintStoryListPanel.tsx`
- Adapter and API route pick up changes via shared mapping — no adapter logic changes expected
- Do NOT modify `BUG_RESOLVED_STATES`, bug metrics, or milestone route

**Files in Scope:**
- `lib/sprints/status-mapping.ts` — new group + map entry + order
- `components/Dashboard/SprintStoryListPanel.tsx` — badge/section color
- `__tests__/lib/sprints/status-mapping.test.ts` — new unit tests
- `__tests__/app/api/sprints/stories/route.test.ts` — Testing mapping case
- `__tests__/lib/dashboard/sprint-stories-adapter.test.ts` — order assertion
- `__tests__/components/Dashboard/SprintStoryListPanel.test.tsx` — Testing section render

**Error Handling:**
- Unknown/Removed states → still excluded (null mapping)
- Empty Testing group → hidden section (existing filter behavior)

**Integration Points:**
- Shared `mapStateToStatusGroup()` used by sprint stories API and milestones (milestones unchanged)

---

## For Review Agents

**Acceptance Criteria:**
1. ADO `Testing` User Stories appear in sprint story API response with `statusGroup: 'Testing'`
2. Panel renders Testing section between Active and Resolved with cyan badges
3. Order is Planned → Active → Testing → Resolved → Completed
4. Bug burndown still treats Testing bugs as closed
5. Milestone breakdown unchanged (Testing not counted)

**Business Rules:**
- User Story sprint lists only — bugs use separate `BUG_RESOLVED_STATES`
- Empty groups hidden; Removed/unknown excluded
- Milestones explicitly out of scope

**Experience Design:**
- Entry: Workstream card → Sprint Stories tab
- Happy path: Testing section visible with stories and count badge
- Moment of truth: Previously hidden QA-stage stories now visible
- Feedback: Inline section appearance (no toast)
- Error: Existing panel error/empty states unchanged

---

## For Testing Agents

**Success Criteria:**
1. 100% of status-mapping unit tests pass including Testing
2. Adapter order test includes Testing in correct position
3. Zero regressions in bug trend tests (`Testing` still closed for bugs)

**Shadow Paths to Verify:**
- **Happy path:** Sprint with Testing stories → section renders with count
- **Nil input:** N/A (state always string from DB)
- **Empty input:** Sprint with no Testing stories → no Testing section
- **Upstream error:** API error → existing error UI unchanged

**Edge Cases:**
- Sprint has only Testing stories → only Testing section shown (plus any other populated groups)
- Story in Testing with null storyPoints → em dash badge (unchanged formatting)

**Coverage Requirements:**
- New status-mapping tests: 100% of mapping function paths
- Updated adapter/panel tests: cover Testing group explicitly

**Test Strategy:**
- Unit: `status-mapping.test.ts`, adapter ordering
- Integration: API route status group mapping
- Component: `SprintStoryListPanel` Testing section color and label
- Regression: run bug trend-service tests unchanged
