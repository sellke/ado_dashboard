# Changelog

## 2026-06-16 — Add unavailable cycle-time drilldown

**Change type:** Scope addition / follow-up story

**Why:** Dashboard users can see unavailable lifecycle-data counts, but need to identify the linked ADO items behind those counts so missing Activated/Closed data can be cleaned up.

**What changed:**

- Added Story 5: Drill Into Unavailable Cycle-Time Items.
- Updated the main spec and lite spec to require clickable unavailable badges.
- Updated the API sub-spec with a focused lazy-loaded unavailable-item endpoint.
- Updated the technical sub-spec with endpoint, modal, parity, and link-construction guidance.
- Updated the user-stories README from 4/4 complete to 4/5 complete.

**Files updated:**

- `spec.md`
- `spec-lite.md`
- `user-stories/README.md`
- `user-stories/story-5-unavailable-drilldown.md`
- `sub-specs/api-spec.md`
- `sub-specs/technical-spec.md`

**Backup location:** `backups/2026-06-16T154100Z/`

**Completed work preserved:** Stories 1-4 remain completed and are not reopened. Story 5 depends on Stories 3 and 4.
