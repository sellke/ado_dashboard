# User Stories Overview

> **Specification:** Common Sprint Tab Selector
> **Created:** 2026-03-05
> **Status:** Planning

## Stories Summary

| Story | Title | Status | Tasks | Progress |
|-------|-------|--------|-------|----------|
| 1 | Refactor SprintStoryListPanel to Controlled Mode | Done | 6 | 6/6 |
| 2 | Create SprintTabSelector Component | Done | 6 | 6/6 |
| 3 | Integrate Shared Sprint Selector into Dashboard | Done | 7 | 7/7 |

**Total Progress:** 19/19 tasks (100%)

## Story Dependencies

```
Story 1 (Refactor Panel) ──┐
                            ├──→ Story 3 (Integration)
Story 2 (New Selector)  ───┘
```

- **Story 1** and **Story 2** can run in parallel (no dependencies between them)
- **Story 3** depends on both Story 1 and Story 2

## Quick Links

- [Story 1: Refactor SprintStoryListPanel to Controlled Mode](./story-1-refactor-sprint-story-list-panel.md)
- [Story 2: Create SprintTabSelector Component](./story-2-sprint-tab-selector-component.md)
- [Story 3: Integrate Shared Sprint Selector into Dashboard](./story-3-integrate-shared-selector.md)

## Implementation Strategy

1. **Start with Stories 1 & 2 in parallel** — they're independent building blocks
2. **Then Story 3** — wires everything together, removes duplicate tab bars
3. Story 3 also cleans up any backward-compatible code from Story 1
