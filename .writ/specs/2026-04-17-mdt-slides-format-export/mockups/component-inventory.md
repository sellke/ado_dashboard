# Component Inventory (Export / MDT Chrome)

Maps Medtronic template elements from `mdt_slides` to implementation ownership. Chart PNGs are **out of scope** for MDT pixel recolor in this spec.

**Gold still:** [`mdt-template-slide-reference.png`](./mdt-template-slide-reference.png) — use for **layout** (regions, whitespace, footer structure); **typography weights/sizes** follow `mdt_slides` + spec contract if the still differs visually.

| UI / chrome element | Skill reference | Owning story | Notes |
| --- | --- | --- | --- |
| Color palette (navy, blue, grays, white) | mdt_slides → Color palette | Story 1 | Bare hex for pptxgenjs |
| Semantic RAG (green/amber/red) | mdt_slides → Semantic status colors | Story 1 | Replaces legacy `rag-colors` |
| Slide title (32pt regular navy) | mdt_slides → Typography | Story 2 | Not bold |
| Subtitle | mdt_slides → Typography | Story 2 | 14pt bold black |
| Footer bar (page, title, date, classification) | mdt_slides → Standard frame | Story 2 | Sequential page # |
| Wordmark region | mdt_slides → Standard frame | Story 2 | Image vs fallback |
| Table header row | mdt_slides → Tables | Story 3 | Navy + white text |
| Table body rows | mdt_slides → Tables | Story 3 | Alternating fills |
| Section / column headers (blue 28pt) | mdt_slides → Two-column layout | Story 3 | Where slides use them |
| Chart image area | Phase 1F | — | PNG from Recharts; separate issue for palette |

## States

- **Default:** White background, MDT footer on every slide.
- **Chart placeholder:** Phase 1F placeholder image; footer/title still MDT (Stories 2–3).
