# Rolling Metrics Detail Modal (Lite)

> Source: .writ/specs/2026-06-16-rolling-metrics-modal/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Modal drilldown for rolling metric tiles: velocity rate, overhead %, carry-over %,
and program-only `Avg Total Delivery/Bug`.

**Implementation Approach:**
- Reuse Mantine `Modal` patterns from `CycleTimeBreakdown` and dashboard panels.
- Keep metric math out of React; render adapter/type-backed values.
- Add modal-ready rolling rows to `lib/dashboard/types.ts` and `adapter.ts`.
- Extend API/view model for program delivery-to-bug per-sprint data.
- Wire only supported tiles; exclude workstream `Delivery/Bug` drilldown.

**Files in Scope:**
- `components/Dashboard/RollingMetricDetailModal.tsx` — new modal.
- `components/Dashboard/ProgramSummarySection.tsx` — program tile affordance/state.
- `components/Dashboard/WorkstreamHealthCard.tsx` — workstream row affordance/state.
- `lib/dashboard/types.ts` — modal row/data contract.
- `lib/dashboard/adapter.ts` — display-ready rolling values.
- `app/api/metrics/route.ts` / metric service if needed — delivery-to-bug sprint data.

**Error Handling:**
- Missing history -> explanatory empty state.
- Null metric values -> `N/A`; no crash.
- Delivery-to-bug zero-bug rules match existing aggregate display.

---

## For Review Agents

**Acceptance Criteria:**
1. Supported metric tiles open an accessible modal by click and keyboard.
2. Modal rows match API/adapter trend data and existing formatting.
3. `Avg Total Delivery/Bug` drilldown exists at program scope only.
4. Workstream `Delivery/Bug` has no drilldown affordance.
5. Tooltips/RAG badges remain usable.

**Business Rules:**
- Velocity rate is `pts/hr`.
- Overhead and carry-over are percentages with 2-decimal display.
- Program delivery-to-bug uses completed ratio rules from completed spec.
- Rolling window follows the existing dashboard trend sprint window.

**Experience Design:**
- Entry: metric tile affordance in program summary/workstream card.
- Happy path: open modal -> see summary value + per-sprint rows.
- Moment of truth: user sees which sprints drove the average/RAG.
- Feedback: immediate modal using loaded dashboard data where possible.
- Error: `N/A`/empty rows explain missing data without breaking dashboard.

**Scope Guard:** Do not change calculations, thresholds, sync depth, or add workstream
delivery-to-bug drilldown.

---

## For Testing Agents

**Success Criteria:**
1. Adapter tests cover modal row mapping and delivery-to-bug fields.
2. Component tests cover open/close, keyboard access, values, and null state.
3. Program-only delivery-to-bug rule is asserted.

**Shadow Paths to Verify:**
- **Happy path:** full window -> summary + sprint rows render.
- **Nil input:** null metric values -> `N/A`.
- **Empty input:** no trend sprints -> empty state.
- **Upstream error:** existing dashboard error remains unchanged.

**Edge Cases:**
- Partial sprint history -> available rows only, no padding.
- Tooltip/RAG click targets do not conflict with modal trigger.
- Zero-bug delivery-to-bug rows preserve existing display semantics.

**Coverage Requirements:** New code >=80%; modal interaction and mapping paths 100%.

**Test Strategy:** Unit adapter mapping, RTL modal interaction tests, focused API route tests if
new delivery-to-bug trend fields are added.
