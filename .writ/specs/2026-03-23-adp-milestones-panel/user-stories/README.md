# User Stories — ADP Milestones Panel

## Progress

| Story | Title | Status | Tasks |
|---|---|---|---|
| Story 1 | Fix ADP Milestones Panel Data Pipeline | Completed ✅ | 7 / 7 |
| Story 2 | Filter Milestone Progress by ADP-MON Tag | Completed ✅ | 6 / 6 |

**Total:** 2 stories · 13 tasks · 13 complete (100%)

---

## Story Descriptions

### Story 1 — Fix ADP Milestones Panel Data Pipeline
Repairs the three-layer pipeline break preventing quarterly milestone data from reaching `MilestoneQuarterlyPanel` in the Program Summary section. Involves a type fix, a computation step in `DashboardContainer`, and prop forwarding through `DashboardShell`.

**No dependencies.** Completed 2026-03-23.

---

### Story 2 — Filter Milestone Progress by ADP-MON Tag
Restricts milestone progress and workstream breakdown calculations to only child User Stories bearing an `ADP-MON` tag (e.g., `ADP-MAR`). Untagged stories under Q#-tagged Features are excluded from all milestone counts. Adds `hasAdpMonTag` helper to `lib/milestones/format.ts` and applies it in the API route handler.

**Depends on:** Story 1 (Complete ✅).

---

## Quick Links

- [Story 1](./story-1-fix-milestones-pipeline.md)
- [Story 2](./story-2-adp-mon-tag-filter.md)
- [Spec](../spec.md)
- [Technical Spec](../sub-specs/technical-spec.md)
