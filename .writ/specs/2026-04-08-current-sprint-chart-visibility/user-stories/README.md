# User Stories — Current Sprint Chart Visibility

> Spec: `.writ/specs/2026-04-08-current-sprint-chart-visibility/spec.md`
> Created: 2026-04-08
> Total Stories: 3 | Completed: 3 | In Progress: 0 | Not Started: 0

## Stories

| # | Story | Priority | Effort | Status | Dependencies |
|---|-------|----------|--------|--------|--------------|
| 1 | [Trend Series Backend](story-1-trend-series-backend.md) | High | Medium | Completed ✅ | None |
| 2 | [Velocity Chart Overlay](story-2-velocity-chart-overlay.md) | High | Medium | Completed ✅ | Story 1 |
| 3 | [Bug Burndown & Overhead Styling](story-3-bug-overhead-styling.md) | Normal | Small | Completed ✅ | Story 1 |

## Dependencies

```
Story 1 (Trend Series Backend)
  ├── Story 2 (Velocity Chart Overlay)
  └── Story 3 (Bug Burndown & Overhead Styling)
```

Stories 2 and 3 both depend on Story 1 emitting the current sprint in the trend series. They can be implemented in parallel once Story 1 is complete.

## Implementation Order

1. **Story 1 first** — backend type + data changes; everything else is blocked on this
2. **Stories 2 and 3 in parallel** — independent frontend changes once Story 1 lands

## Quick Links

- [spec.md](../spec.md)
- [spec-lite.md](../spec-lite.md)
- [technical-spec.md](../sub-specs/technical-spec.md)
