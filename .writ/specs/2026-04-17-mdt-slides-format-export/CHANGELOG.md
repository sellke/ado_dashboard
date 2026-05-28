# Changelog — MDT Slides Format Export

## 2026-04-17 — Implementation (Stories 1–3)

- **Change type:** Feature implementation.
- **What changed:** Added `lib/export/mdt-theme.ts`, `lib/export/slide-frame.ts`; aligned `rag-colors.ts` to MDT semantic RAG hex; refactored all `lib/export/slides/*.tsx` + `builder.ts` for MDT title block, footer (page #, metadata, “Medtronic” text wordmark), repositioned content below the standard frame; section headers on workstream slides use blue 28pt; KPI tiles use `ragColor` + navy neutrals.
- **Tests:** Updated `__tests__/lib/export/*`; added `mdt-theme.test.ts`.
- **Spec:** Stories 1–3 marked complete; `spec.md` status Complete.

## 2026-04-17 — Visual reference image

- **Change type:** Scope clarification / visual reference (documentation + mockup asset).
- **What changed:** Added gold-standard template PNG `mockups/mdt-template-slide-reference.png`; expanded `spec.md` → Visual references with placeholder strings, layout notes, and typography precedence rule (`mdt_slides` over raster appearance); updated `mockups/README.md`, `component-inventory.md`, `sub-specs/technical-spec.md`, `spec-lite.md`, Story 2 visual references and acceptance criteria; `user-stories/README.md` quick link.
- **Files updated:** `spec.md`, `spec-lite.md`, `mockups/README.md`, `mockups/component-inventory.md`, `mockups/mdt-template-slide-reference.png` (new), `sub-specs/technical-spec.md`, `user-stories/story-2-slide-frame-footer.md`, `user-stories/README.md`, `CHANGELOG.md`.
- **Backup:** `.writ/specs/2026-04-17-mdt-slides-format-export/backups/20260417-144019/`
