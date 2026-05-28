# Apply mdt_slides Skill Standards to Exported PPTX

> **Type:** Improvement
> **Priority:** Normal
> **Effort:** Medium
> **Created:** 2026-04-17
> **spec_ref:** `.writ/specs/2026-04-17-mdt-slides-format-export/spec.md`

## TL;DR

Align generated `.pptx` layout, colors, typography, tables, and footer treatment with the Medtronic slide conventions documented in `.cursor/skills/mdt_slides.md`.

## Current State

- Export builds slides via `pptxgenjs` with project RAG colors and ad hoc layout (`lib/export/`)
- Deck does not systematically follow MDT corporate template rules (navy + bright blue palette, standard footer with page number / title / date / classification, wordmark placement, table row styling)
- Skill exists for human/AI-authored slides but is not encoded as shared constants or applied in the export pipeline

## Expected Outcome

- Exported decks visually match Medtronic standard slide language from `mdt_slides` (palette, typography fallback per skill, white backgrounds, alternating table rows where applicable)
- Standard footer and classification line implemented consistently across slides (within `pptxgenjs` constraints)
- Medtronic wordmark or agreed substitute documented if full asset cannot be embedded in the browser bundle
- Single source of truth for MDT export styling (e.g. shared theme module) so future slide edits stay on-brand

## Relevant Files

- `.cursor/skills/mdt_slides.md` - authoritative MDT slide rules to implement
- `lib/export/builder.ts` - presentation assembly and slide order
- `lib/export/rag-colors.ts` - may need reconciliation or extension with MDT palette from the skill

## Related Issues

- [2026-04-16-pptx-charts-match-dashboard](./2026-04-16-pptx-charts-match-dashboard.md) - chart/dashboard visual parity; complementary to corporate template formatting

## Notes

- Skill notes Avenir Next as brand font with `Calibri` fallback in `pptxgenjs` environments; confirm acceptable for stakeholders before heavy asset work.
