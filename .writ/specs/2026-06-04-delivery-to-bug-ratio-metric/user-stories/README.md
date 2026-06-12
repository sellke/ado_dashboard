# User Stories — Delivery-to-Bug Ratio Metric

> Parent spec: ../spec.md

## Summary

| # | Story | Status | Tasks | Dependencies |
|---|---|---|---|---|
| 1 | [Ratio Calculation, RAG, and Seeded Threshold](story-1-calculation-rag-threshold.md) | Completed ✅ | 7 | None |
| 2 | [API Derivation and Aggregation](story-2-api-aggregation.md) | Completed ✅ | 7 | Story 1 |
| 3 | [Workstream & Program Tiles](story-3-tiles-ui.md) | Completed ✅ | 7 | Story 2 |

**Total:** 3 stories · 21 tasks · 100% complete

## Dependency Flow

```
Story 1 (pure calc + RAG + threshold + definitions)
   └── Story 2 (trend-service aggregation + route + API types)
          └── Story 3 (adapter tiles + view-model types + component)
```

Stories are strictly sequential: each layer consumes the one below. Story 1 is the tested source of
truth for the math; Story 2 derives + aggregates it through the API; Story 3 surfaces the two tiles.

## Key Decisions (locked in contract)

- **1 SP = 1 hour** numerator; denominator = existing `bugHours`.
- **Sum-then-divide** for both the rolling window and the program aggregate.
- **Zero bug hours:** `—` + Green when delivery > 0; `—` + no RAG when `0/0`.
- **RAG (higher = healthier):** Green ≥ 4, Amber 2–3.99, Red < 2 (seeded `deliveryToBugRatio`).
- **No Prisma migration** — derived from persisted `completedPoints` + `bugHours`.
- **Tiles only** — no trend chart, no export.

## Cross-Spec Note

Touches the same files as `2026-06-04-prev-sprint-tabs-full-rolling-window` (`route.ts`,
`trend-service.ts`, `components/Dashboard/*`). Additive but overlapping — sequence after that spec
merges, or plan a small manual merge.
