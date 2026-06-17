# Refresh Log

## 2026-06-04 — /create-spec refreshed

**Source:** Conversation context (a `/create-spec --from-issue` run)
**Signals found:** 3 total, 2 actionable (1 positive/preserve)
**Amendments applied:** 4 of 4 proposed

**Changes:**
- Add "Output Discipline" guardrail to Overview (Confidence: High, applied)
- Clarify Plan Mode scope in Step 1.2 ("Discovery only") (Confidence: High, applied)
- Make Phase 1 to Phase 2 transition explicit — return to Agent Mode, no native plan tool (Confidence: High, applied)
- Reinforce at the Phase 2 trigger — write files directly, never a host plan/Build step (Confidence: Medium, applied)

**Not applied:**
- None

**Friction addressed:** During Phase 2, the agent used the host's native plan tool (Cursor `CreatePlan`, producing a `.plan.md`) and headed toward a Build flow, instead of writing the markdown spec package directly from the command's context.

**Scope:** Local only
**Target file:** .cursor/commands/create-spec.md

## 2026-06-17 — /release refreshed

**Source:** Conversation context (`/release | /ship` on v0.6.1 bootstrap work)
**Signals found:** 4 total, 4 actionable
**Amendments applied:** 6 of 6 proposed

**Changes:**
- Add `--merge` mode to Modes table and flag-combination note (Confidence: High, applied)
- Add Phase 2.5 Integration Branch merge step before version bump (Confidence: High, applied)
- Warn when not on Default Branch without `--merge` (Confidence: High, applied)
- Update dry-run preview for `--merge` (Confidence: High, applied)
- Revise Integration with Writ — ship → release --merge flow; discourage parallel `/release | /ship` (Confidence: High, applied)
- Add merge conflict and off-default-branch error handling (Confidence: High, applied)

**Not applied:**
- None

**Friction addressed:** Release commits on a feature branch required a manual "merge to main" step before tags landed on the integration branch. User set Default Branch to `main` in `.writ/config.md`.

**Scope:** Local only
**Target file:** .cursor/commands/release.md
