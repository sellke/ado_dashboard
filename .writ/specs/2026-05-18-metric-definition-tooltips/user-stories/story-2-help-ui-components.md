# Story 2: Help UI Components (MetricDefinitionHint + RagBadge Tooltips)

> **Status:** Complete
> **Priority:** High
> **Dependencies:** Story 1
> **Spec:** `.writ/specs/2026-05-18-metric-definition-tooltips/spec.md`

---

## User Story

**As a** dashboard user,
**I want** info icons on metric labels and tooltips on RAG badges that explain definitions and calculations,
**So that** I can understand what each number means and how it is computed without reading code or external docs.

---

## Acceptance Criteria

- [ ] Given a valid `metricId` from Story 1, when `MetricDefinitionHint` renders beside a metric label, then an info icon appears with a multiline tooltip showing Definition and Calculation text on hover and keyboard focus.
- [ ] Given an unknown or missing `metricId`, when `MetricDefinitionHint` renders, then no info icon is shown and the surrounding layout is unchanged.
- [ ] Given `RagBadge` receives a non-null `rag` and a `ragTooltip` string, when the user hovers or focuses the badge, then a multiline tooltip displays the RAG explanation without changing badge size, color, or variant.
- [ ] Given `RagBadge` receives a non-null `rag` but no `ragTooltip`, when rendered, then the badge behaves exactly as today (no tooltip wrapper).
- [ ] Given keyboard and assistive technology users interact with hints and RAG badges, when tooltips open, then each affordance is focusable, has a descriptive `aria-label`, and uses Mantine tooltip props consistent with existing dashboard patterns (`withArrow`, `multiline`, `maw={360}`, `openDelay={300}`).

---

## Implementation Tasks

- [ ] **2.1** Write component tests for `MetricDefinitionHint` covering tooltip content from `getMetricTooltip`, hover/focus behavior, and null render for unknown `metricId`.
- [ ] **2.2** Write component tests for `RagBadge` covering tooltip-on-badge when `ragTooltip` is set, unchanged behavior when omitted, and no tooltip when `rag` is null.
- [ ] **2.3** Create `components/Dashboard/MetricDefinitionHint.tsx` — `ActionIcon` with `IconInfoCircle` (14px), `variant="subtle"`, `size="xs"`, `aria-label={`Definition for ${label}`}`, wrapped in Mantine `Tooltip` calling `getMetricTooltip(metricId)`.
- [ ] **2.4** Extend `components/Dashboard/RagBadge.tsx` with optional `ragTooltip?: string | null`; when provided, wrap the existing `<Badge>` in `<Tooltip label={ragTooltip} withArrow multiline maw={360} openDelay={300}>`.
- [ ] **2.5** Add Storybook story `components/Dashboard/MetricDefinitionHint.story.tsx` demonstrating each `MetricId` variant and the unknown-id null case.
- [ ] **2.6** Update `components/Dashboard/RagBadge.story.tsx` to show badge with and without `ragTooltip`.
- [ ] **2.7** Verify new and existing `RagBadge` component tests pass; confirm no TypeScript errors and no visual layout shift beyond the added info icon footprint.

---

## Technical Notes

- **Hybrid UX:** Info icon on metric labels and chart headers (`MetricDefinitionHint`); RAG badge is its own tooltip trigger when `ragTooltip` is provided — no extra icon on badges.
- **Story 1 dependency:** Import `MetricId`, `getMetricTooltip`, and `getRagTooltip` from `lib/metrics/definitions.ts`; do not duplicate copy in components.
- **Mantine tooltip props (both components):** `withArrow`, `multiline`, `maw={360}`, `openDelay={300}` — matches `SprintStoryListPanel`, `CurrentSprintItemTables`, and `SprintBugList`.
- **MetricDefinitionHint:** Use `@tabler/icons-react` `IconInfoCircle` at size 14; `ActionIcon` must remain focusable (`tabIndex={0}` default on ActionIcon) so tooltip opens on keyboard focus.
- **RagBadge:** Callers (Story 3 integration) pass `ragTooltip={getRagTooltip(metricId)}`; this story only extends the component — no dashboard wiring yet.
- **Null safety:** `MetricDefinitionHint` returns `null` for unknown ids; `RagBadge` returns `null` when `rag === null` regardless of `ragTooltip`.

---

## Context for Agents

- **Parent contract:** `spec.md` → Contract Summary, Experience Design (Entry points, Feedback model, State catalog), Detailed Requirements item 3 (Shared UI components).
- **Component API:** `sub-specs/technical-spec.md` → UI Components → `MetricDefinitionHint` and `RagBadge extension`.
- **Registry dependency:** `sub-specs/technical-spec.md` → Metric ID Registry and `getMetricTooltip` / `getRagTooltip` helpers (Story 1).
- **Error map:** `sub-specs/technical-spec.md` → Error & Rescue Map rows for unknown `metricId` and `rag === null`.
- **Shadow paths:** `sub-specs/technical-spec.md` → Shadow Paths → Metric hint and RAG badge tooltip flows.
- **Interaction edge cases:** `sub-specs/technical-spec.md` → Interaction Edge Cases (keyboard tab, screen reader, independent badge vs icon tooltips).
- **Relevant code:** `components/Dashboard/RagBadge.tsx` (extend), new `MetricDefinitionHint.tsx`, existing tooltip patterns in `SprintStoryListPanel.tsx`.
- **Test files:** `__tests__/components/Dashboard/MetricDefinitionHint.test.tsx`, extend `__tests__/components/Dashboard/RagBadge.test.tsx`.
- **Out of scope for this story:** Wiring into `ProgramSummarySection.tsx` or `WorkstreamHealthCard.tsx` (Story 3).

---

## Definition of Done

- [ ] `MetricDefinitionHint` renders info icon + definition/calculation tooltip for all valid `MetricId` values from Story 1.
- [ ] Unknown `metricId` renders nothing; no broken affordance or layout shift on metric values.
- [ ] `RagBadge` accepts optional `ragTooltip` and wraps badge in tooltip only when provided.
- [ ] Existing `RagBadge` behavior preserved when `ragTooltip` is omitted; null `rag` still renders nothing.
- [ ] Component tests cover hover/focus tooltip behavior for both components.
- [ ] Storybook stories demonstrate metric hint variants and RAG badge tooltip states.
- [ ] All new and updated component tests pass; TypeScript clean.
