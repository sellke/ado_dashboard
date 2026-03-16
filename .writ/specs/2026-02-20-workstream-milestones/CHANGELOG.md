# Specification Changelog

## [2026-03-09] - ADP Tag Model & Q4 Extension

**Modification Contract:** Migrate tag model from `{MonthAbbr}-Goal` to strict `ADP-{MON}` format, add `Qx` quarter tags for quarterly grouping, align spec with codebase reality, and add 4 new stories for gap fixes and ADP requirements.

### Changes Made

#### Tag Model (Breaking Change)
- Replaced `{MonthAbbr}-Goal` format (e.g., `Feb-Goal`) with strict `ADP-{MON}` format (e.g., `ADP-FEB`)
- Added `Qx` quarter tag support (e.g., `Q4`) for explicit quarterly roll-up grouping
- Strict enforcement: all non-conforming tags are ignored — no backward compatibility

#### Spec Status Alignment
- Updated spec header from `Status: Planning` to `Status: Complete (Phase 1) — ADP Extension In Progress`
- Checked Story 6 acceptance criteria checkboxes (were unchecked despite DoD being complete)
- Added Q4 ADP Context notes to all 6 existing stories

#### New Stories (Phase 2 — ADP Extension)
- **Story 7: ADP Tag Format Migration** (7 tasks) — Replace `-Goal` parsing with `ADP-{MON}`, update WIQL
- **Story 8: Quarter Tag Parsing & Rollup** (7 tasks) — Parse `Qx` tags, quarter-driven program rollup
- **Story 9: Milestone Status Derivation Fix** (5 tasks) — Wire `deriveMilestoneStatus()` into API, fix card status check
- **Story 10: Program Rollup UI** (5 tasks) — Surface `programRollup` in ProgramSummarySection

#### Codebase Gaps Addressed
- Status mismatch: `FeatureMilestoneCard` checks `'Complete'` but API returns `'Done'` → Story 9
- Unused `deriveMilestoneStatus()` → Story 9
- Program rollup computed but not surfaced → Story 10
- Quarter grouping inferred from month → Story 8 (explicit `Qx` tags)

#### ADP & Q4 Delivery Context
- Added "ADP & Q4 FY26 Delivery Context" section to spec.md
- All stories framed within Q4 FY26 (Jan–Mar 2026) ADP delivery timeline
- Spec and sub-specs updated with ADP tag references throughout

### Files Updated
- `spec.md` — Tag model, ADP context, status, scope boundaries, build order, files affected
- `spec-lite.md` — Rewritten for ADP tag model and 10-story structure
- `sub-specs/technical-spec.md` — Tag parsing logic, quarter parsing, test strategy
- `sub-specs/api-spec.md` — Quarter field, status derivation, tag filtering
- `user-stories/README.md` — Phase 1/Phase 2 structure, stories 7-10 added
- `user-stories/story-1-feature-goal-sync.md` — Q4 ADP context note, WIQL note updated
- `user-stories/story-2-progress-calculator.md` — Q4 ADP context note
- `user-stories/story-3-api-extension.md` — Q4 ADP context note
- `user-stories/story-4-types-and-adapter.md` — Q4 ADP context note
- `user-stories/story-5-milestone-goals-panel.md` — Q4 ADP context note
- `user-stories/story-6-dashboard-integration.md` — Acceptance checkboxes checked, Q4 ADP context note
- `user-stories/story-7-adp-tag-migration.md` — 🆕 Created
- `user-stories/story-8-quarter-tag-parsing.md` — 🆕 Created
- `user-stories/story-9-status-derivation-fix.md` — 🆕 Created
- `user-stories/story-10-program-rollup-ui.md` — 🆕 Created

### Backup Location
`backups/2026-03-09T13-49-31/`
