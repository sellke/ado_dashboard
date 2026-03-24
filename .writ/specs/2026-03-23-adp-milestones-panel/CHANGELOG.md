# Spec Changelog — ADP Milestones Panel

## 2026-03-23 — ADP-MON Tag Filter (edit-spec)

**Change type:** Modifying existing scope + adding new story  
**What changed:** Restricted milestone progress and workstream breakdown to only count User Stories with `ADP-MON` tags. All other child stories under Q#-tagged Features are now explicitly excluded.

**Files updated:**
- `spec.md` — Business Rules, Tagging Model, Success Criteria, Scope Boundaries, Files in Scope table
- `spec-lite.md` — Removed "no API changes" constraint; added new files in scope
- `sub-specs/technical-spec.md` — Added Change 4 (ADP-MON filter) and route test strategy
- `user-stories/README.md` — Added Story 2 row; updated totals
- `user-stories/story-2-adp-mon-tag-filter.md` — New story created

**Backup location:** `backups/2026-03-23T14-00-00Z/`

**Constraint inverted:** `spec.md` previously excluded `/api/milestones` route changes ("it already returns the right data"). This change requires the route to filter child stories to ADP-MON-tagged only. Story 1 wiring is unaffected.
