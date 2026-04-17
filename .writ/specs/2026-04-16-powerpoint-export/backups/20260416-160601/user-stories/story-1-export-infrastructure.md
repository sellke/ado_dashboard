# Story 1: Export Infrastructure

**Status:** Not Started
**Priority:** High
**Dependencies:** None
**Effort:** S

## User Story

As a dashboard user,
I want an "Export PPTX" button in the dashboard header,
So that I can trigger a PowerPoint export with a single click and see clear feedback while it generates.

## Acceptance Criteria

**Given** the dashboard is loaded,
**When** I look at the header area,
**Then** I see an "Export PPTX" button alongside the "Sync Now" button.

**Given** I click "Export PPTX",
**When** the export is generating,
**Then** the button shows a spinner and "Generating…" label and is disabled.

**Given** the export succeeds,
**When** the file is ready,
**Then** the button returns to idle state and the browser download begins automatically.

**Given** the export throws an error,
**When** the error is caught,
**Then** a Mantine notification appears with the error message and the button returns to idle.

**Given** the export is in progress,
**When** I look at the page,
**Then** the rest of the dashboard is unaffected — no loading state, no layout shift.

## Implementation Tasks

- [ ] Install `pptxgenjs` via pnpm: `pnpm add pptxgenjs`
- [ ] Create `lib/export/types.ts` — define `ExportInput` interface (sprintName, computedAt, programMetrics, programRollup, workstreams: WorkstreamCardViewModel[], rawWorkstreams: ApiWorkstream[], milestones: ApiMilestoneWithProgress[])
- [ ] Create `lib/export/rag-colors.ts` — RAG hex constants (Green: `2f9e44`, Amber: `e67700`, Red: `c92a2a`, null: `868e96`) and `ragColor(rag)` helper
- [ ] Create `lib/export/index.ts` — export `ExportInput` type and stub `buildPresentation()` that returns a new pptxgenjs Presentation (no slides yet)
- [ ] Create `components/Dashboard/ExportControl.tsx` — Button with `IconPresentation`, loading state (spinner + "Generating…"), disabled during export; errors surfaced by caller via `notifications.show()`
- [ ] Modify `components/Dashboard/DashboardContainer.tsx` — add `exportInProgress` state, `handleExport` callback (dynamic import pptxgenjs, call `buildPresentation`, call `prs.writeFile`, catch errors with `notifications.show()`), render `<ExportControl>` in header Group alongside `<SyncControl>`
- [ ] Write unit tests for `ragColor()` helper — all four RAG inputs (Green, Amber, Red, null)

## Technical Notes

- pptxgenjs must be dynamically imported at call time: `const PptxGenJS = (await import('pptxgenjs')).default` — never at module level, to avoid SSR bundling issues in Next.js 15
- `ExportControl` is a `'use client'` component; errors are surfaced via `notifications.show()` from `@mantine/notifications` in the `handleExport` callback — not via inline alert
- `buildPresentation()` in this story is a stub: returns a pptxgenjs Presentation with `layout = 'LAYOUT_WIDE'` and no slides. Stories 2–5 add slides, Story 6 wires them together.
- `handleExport` file naming: `LiveLink-Health-Report-${new Date().toISOString().slice(0, 10)}.pptx`

## Context for Agents

- spec.md → ## Implementation Approach (full file/module list)
- spec.md → ## 📋 Business Rules → pptxgenjs Import Strategy
- technical-spec.md → Component: ExportControl.tsx
- technical-spec.md → DashboardContainer.tsx Changes
- RAG colors: Green `#2f9e44` · Amber `#e67700` · Red `#c92a2a` · null `#868e96` (pptxgenjs uses hex without `#`)
- `DashboardContainer` is already `'use client'` — no directive change needed
- `@mantine/notifications` is available via `@mantine/core` — use `notifications.show()`
- Tabler icon for export: `IconPresentation` from `@tabler/icons-react`

## Definition of Done

- [ ] `pptxgenjs` appears in `package.json` dependencies
- [ ] `lib/export/types.ts`, `lib/export/rag-colors.ts`, `lib/export/index.ts` exist and TypeScript-clean
- [ ] `ExportControl.tsx` renders correctly in idle and `isExporting` states
- [ ] "Export PPTX" button appears in dashboard header alongside "Sync Now"
- [ ] Clicking "Export PPTX" triggers a download attempt (even if the pptx has no slides yet)
- [ ] Export errors show as Mantine notification without breaking the dashboard
- [ ] `ragColor()` unit tests pass
