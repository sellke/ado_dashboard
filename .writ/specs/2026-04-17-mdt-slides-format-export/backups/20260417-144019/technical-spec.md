# Technical Spec: MDT Slides Format Export

> Parent: `../spec.md`  
> Stories: `../user-stories/story-1-mdt-theme-module.md`, `story-2-slide-frame-footer.md`, `story-3-slide-content-tables.md`

## Architecture

- **Theme layer:** `lib/export/mdt-theme.ts` exports constants + small helpers (e.g. `footerLineParts(exportMeta)`) consumed by slide builders.
- **Presentation builder:** `lib/export/builder.ts` keeps orchestration; may pass slide index for page numbers into builders or a shared `addStandardFooter(slide, idx, total, meta)`.
- **Slide modules:** `lib/export/slides/*.tsx` — replace inline hex/font with theme imports.

## pptxgenjs constraints

- Colors: hex strings **without** `#` prefix (match existing `rag-colors` convention).
- Fonts: use `face: 'Calibri'` (or theme constant) — Avenir Next unavailable in browser bundle.
- Images: wordmark optional `slide.addImage` from `public/` or imported asset; if missing, omit or use text per spec decision.

## Error & Rescue Map

| Operation | What Can Fail | Planned Handling | Test Strategy |
| --- | --- | --- | --- |
| Load wordmark asset | Missing file / bad URL | Skip image; document fallback; optional placeholder text | Unit: theme flag `wordmarkAvailable`; manual: open deck |
| `slide.addTable` | Invalid row data | Current `lib/export` has **no** `addTable` usage — when tables are added, use MDT row builders + guard empty data | N/A until tables exist |
| Footer text overflow | Long program title | Truncate with ellipsis or reduce font — document in story-2 | Manual visual |
| Theme refactor regression | Wrong hex | Unit tests on constants + snapshot of `ragColor` | Vitest |

## Shadow Paths (user-visible)

| Flow | Happy Path | Nil Input | Empty Input | Upstream Error |
| --- | --- | --- | --- | --- |
| Export PPTX | Deck downloads; MDT chrome on all slides | N/A (button always has context) | Sparse data slides still show footer/titles | Toast; chrome N/A |

## Interaction edge cases

| Edge Case | Planned Handling |
| --- | --- |
| Very long workstream name in subtitle | Truncate or wrap per theme helper |
| Many slides (performance) | Keep serial capture; footer add must be O(1) per slide |

## Traceability

| Story | Code focus |
| --- | --- |
| 1 | `mdt-theme.ts`, `rag-colors.ts`, tests |
| 2 | `builder.ts`, shared footer/title helpers, all `slides/*.tsx` entry points |
| 3 | Table styling, remaining typography in slide bodies |
