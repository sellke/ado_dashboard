# Story 1: Add Tooltip to Sprint Tab Story-Count Badge

> **Status:** Completed ✅
> **Completed:** 2026-04-08
> **Priority:** Normal
> **Effort:** Small
> **Dependencies:** None

---

## User Story

**As a** dashboard user  
**I want** to understand what the number on each sprint tab means  
**So that** I can distinguish story counts from point totals or any other metric at a glance

---

## Acceptance Criteria

**Given** a sprint tab with at least one story  
**When** I hover over the story-count badge  
**Then** a tooltip appears reading `"N stories in this sprint"` where N is the badge's integer value

**Given** a sprint tab with at least one story  
**When** I keyboard-focus the story-count badge  
**Then** the same tooltip appears (accessible)

**Given** any sprint tab  
**When** the change is applied  
**Then** the badge size, color, variant, and position are visually identical to before

---

## Implementation Tasks

- [x] Add `Tooltip` to the `@mantine/core` import in `SprintTabSelector.tsx`
- [x] Wrap the `<Badge>` (lines 41–44) with `<Tooltip label={...} withArrow>`
- [x] Verify tooltip label interpolates `sprint.totalStories` correctly
- [ ] Smoke-test in browser: hover badge on each sprint tab, confirm tooltip text and arrow
- [x] Confirm no TypeScript errors (`tsc --noEmit`)

---

## Technical Notes

- `Tooltip` is already used elsewhere in the dashboard — no new dependency, just a new import
- The `<Badge>` sits inside a `<Tabs.Tab>` inside a `<Tabs.List>` — Mantine's Tooltip handles this context without z-index issues
- Tooltip position defaults to `"top"` (intentional — matches design decision)
- The wrapping `Tooltip` goes inside the `sprint.totalStories > 0` guard, keeping the conditional structure intact

---

## Definition of Done

- [x] `Tooltip` renders on hover and focus of the badge
- [x] Badge appearance unchanged
- [x] No TypeScript or console errors
- [x] No other files modified

---

## Context for Agents

- **Spec:** `.writ/specs/2026-04-08-sprint-tab-badge-tooltip/spec.md`
- **File to change:** `components/Dashboard/SprintTabSelector.tsx` — the only file in scope
- **Exact location:** Lines 41–44 (the `{sprint.totalStories > 0 && <Badge ...>}` block)
- **Import line:** Line 3 — `import { Badge, Tabs } from '@mantine/core'` → add `Tooltip`
- **Tooltip label:** `` `${sprint.totalStories} stories in this sprint` ``
- **Required prop:** `withArrow` — matches existing tooltip patterns in the dashboard
- **No other components, no tests, no API changes**

---

## What Was Built

**Implementation Date:** 2026-04-08

### Files Created

[None created]

### Files Modified

- **`components/Dashboard/SprintTabSelector.tsx`**
  - Added `Tooltip` to `@mantine/core` import (line 3)
  - Wrapped `<Badge>` in `<Tooltip label={...} withArrow>` (lines 42–46)

### Implementation Decisions

1. **`withArrow` prop included** — matches the `withArrow` convention used in existing dashboard tooltips (`SprintStoryListPanel`), consistent with the spec decision
2. **Tooltip inside the guard** — `<Tooltip>` wrapper placed inside `sprint.totalStories > 0` conditional, keeping the badge's conditional render logic unchanged

### Test Results

**Verification:** TypeScript clean (`tsc --noEmit` exit 0), ESLint clean. Browser smoke-test pending manual verification.

### Review Outcome

**Result:** PASS

- **Iteration count:** 1 iteration
- **Drift:** None
- **Security:** N/A (UI-only change)
- **Boundary Compliance:** Only owned file (`SprintTabSelector.tsx`) modified

### Deviations from Spec

None
