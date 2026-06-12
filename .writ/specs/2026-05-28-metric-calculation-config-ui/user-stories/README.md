# User Stories — Metric Calculation Configuration UI

> Spec: ../spec.md
> Status: Complete ✅
> Last refreshed: 2026-06-11 (aligned with delivery-to-bug-ratio metric)

## Summary

| # | Story | Phase | Tasks | Status |
|---|---|---|---|---|
| 1 | [Config schema, migration & seeded defaults](story-1-config-schema-and-defaults.md) | Foundation | 6 | Completed ✅ |
| 2 | [Config-driven engine refactor](story-2-config-driven-engine-refactor.md) | Foundation | 7 | Completed ✅ |
| 3 | [Config read/write API + validation](story-3-config-api-and-validation.md) | API | 7 | Completed ✅ |
| 4 | [Settings panel shell + RAG threshold editor](story-4-settings-shell-and-threshold-editor.md) | Phase 1 UI | 6 | Completed ✅ |
| 5 | [Inclusion rules + velocity/rolling editors](story-5-rules-and-velocity-rolling-editors.md) | Phase 2+3 UI | 6 | Completed ✅ |
| 6 | [Recalculate-now action + regression tests](story-6-recalculate-and-regression.md) | Recalc | 5 | Completed ✅ |

**Total:** 6 stories · 37 implementation tasks · 100% complete

## Dependencies

```
Story 1 (schema + defaults)
  ├─> Story 2 (engine refactor)
  └─> Story 3 (config API)
        └─> Story 4 (settings shell + threshold tab)
              └─> Story 5 (rules + velocity/rolling tabs)   [also needs Story 2]
Story 6 (recalculate + regression)   [needs Story 2 + Story 3]
```

- **Story 1** — no dependencies; ships the storage + zero-drift defaults.
- **Story 2** — needs Story 1's types/defaults to refactor the engine.
- **Story 3** — needs Story 1's schema to read/write config.
- **Story 4** — needs Story 3's API; delivers Phase 1 (threshold) UI + panel shell.
- **Story 5** — needs Story 4's shell and Story 2's refactor to make rule/cutoff edits effective.
- **Story 6** — needs Story 2 (engine) + Story 3 (API); adds opt-in recompute + the
  regression proof of zero drift.

## Recommended sequence

1 → 2 → 3 → 4 → 5 → 6. Stories 2 and 3 can proceed in parallel after Story 1.
Phase 1 (threshold editing) is shippable after Story 4.

## Notes

- **Zero-drift guarantee** (Stories 2 & 6) is the highest-value safety net — default config
  must reproduce today's exact metric numbers.
- **Tooltip drift follow-up:** `2026-05-18-metric-definition-tooltips` static copy goes
  stale once values are editable — documented in Story 6, tracked as out-of-scope follow-up.
- **Delivery-to-bug shipped:** `2026-06-04-delivery-to-bug-ratio-metric` added the metric,
  threshold row, and tiles; this spec adds config UI/API on top.
- **Entry-point coordination:** align the settings surface with
  `2026-05-27-dashboard-workstream-config-ui`.
