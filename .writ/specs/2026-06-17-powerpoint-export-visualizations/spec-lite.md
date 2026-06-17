# PowerPoint Export Visualizations (Lite)

> Source: .writ/specs/2026-06-17-powerpoint-export-visualizations/spec.md
> Purpose: Efficient AI context for implementation

## For Coding Agents

**Deliverable:** Layered PPTX export deck with improved existing slides plus program/workstream snapshots and appendix-style metric context.

**Implementation Approach:**
- Add a slide-plan abstraction before building slides; old count was `1 + workstreams * 4`.
- Prefer native pptx summary visuals for snapshots/appendices; use Recharts PNG only for true charts.
- Extend `ExportInput`/export adapter with display-ready snapshot, rolling, cycle-time, milestone, and caveat fields.
- Keep metric math in existing metric/dashboard layers, not slide builders.
- Explicitly resolve MDT canvas/layout mismatch: current code uses `LAYOUT_WIDE`, current MDT skill says 16 x 9.

**Files in Scope:**
- `lib/export/builder.ts` - sectioned slide orchestration and page counts.
- `lib/export/types.ts` - additive export visualization contract.
- `lib/export/slides/*.tsx` - new snapshots/appendices and readability pass.
- `lib/export/mdt-theme.ts`, `slide-frame.ts` - layout/theme constants as needed.
- `components/Dashboard/DashboardContainer.tsx` - export input assembly only if needed.
- `lib/dashboard/adapter.ts`, `types.ts` - display-ready export fields if needed.

**Error Handling:**
- Missing metrics/trends/cycle-time/milestones -> readable placeholders/caveats.
- Chart capture failure -> placeholder, continue deck.
- Partial data -> explicit caveat, never misleading zero.

---

## For Review Agents

**Acceptance Criteria:**
1. Deck has layered structure: program snapshot, workstream snapshots, upgraded detail slides, appendix/detail context.
2. Slides are readable in PowerPoint: labels, legends, RAG/status cues, source date, and unavailable notes.
3. Export entry point, filename, loading/error UX, and graceful chart failure behavior remain intact.
4. Slide page numbers/footers stay correct for dynamic workstream count.
5. No duplicate metric calculations are added in export slide code.

**Business Rules:**
- Main deck stays concise; appendix/detail slides explain evidence.
- Existing dashboard RAG thresholds, rolling-window rules, and cycle-time semantics are source of truth.
- Program delivery-to-bug detail is program-only.
- Unavailable cycle-time data must be surfaced, not hidden.
- Native slide elements follow MDT theme/chrome.

**Experience Design:**
- Entry: existing `Export PPTX` button.
- Happy path: open deck -> scan program -> compare workstreams -> inspect appendix evidence.
- Moment of truth: stakeholder understands risk drivers without opening app.
- Feedback: button state unchanged; deck has clear labels and caveats.
- Error: placeholders preserve deck generation.

**Cross-Spec Overlap:** Completed PowerPoint export, completed MDT slides, completed rolling metrics modal, cycle-time metrics spec.

---

## For Testing Agents

**Success Criteria:**
1. Slide-plan tests cover dynamic workstream counts and total page numbering.
2. Export input mapping tests cover snapshots, rolling, cycle-time, milestones, and caveats.
3. Slide builder tests cover full, nil, empty, partial, and chart-failure states.
4. Manual exported PPTX review confirms readability and MDT chrome.

**Shadow Paths to Verify:**
- **Happy path:** full data -> layered deck renders all sections.
- **Nil input:** null metrics/rollups -> placeholders, no crash.
- **Empty input:** no workstreams/trends/milestones -> concise empty states.
- **Upstream error:** dashboard/export failure UX unchanged.

**Edge Cases:**
- Dynamic scoped workstream count, including one and many.
- Long workstream names and metric labels.
- Partial rolling window or cycle-time unavailable counts.
- Chart capture failure on one detail slide.

**Coverage Requirements:** New export planning/mapping code >=80%; slide-plan and missing-data paths 100%.

**Test Strategy:** Unit slide-plan/export adapter tests, focused slide-builder tests/mocks, existing dashboard export interaction tests, manual PowerPoint open.
