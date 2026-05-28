---
name: mdt_slide
description: "Use this skill whenever building or restyling PowerPoint slides for Medtronic (MDT) audiences, or when the user references 'Medtronic template', 'MDT slide', 'mdt_slide', or asks for slides to match Medtronic brand. Produces slides matching the Medtronic Quick Start template (Feb 2026 refresh): 16×9 canvas, Avenir Next World typography, deep-navy / electric-blue / charcoal palette with six brand accents, light or dark masters, standard footer with page number / title / date / classification, and the Medtronic wordmark graphic bottom-right. Do NOT use for other brands or generic decks — this skill is tuned to MDT's specific visual language."
license: Proprietary. Conventions extracted from Medtronic Quick Start PPT template (February 2026 release).
---

# Medtronic (MDT) Slide Skill

Builds slides that match Medtronic's standard corporate template — the Quick Start template released February 2026. Pair with the `pptx` skill for general PowerPoint mechanics; this skill only covers brand-specific styling.

## Source of truth

The authoritative template lives at:

```
assets/templates/mdt-quick-start-2026-02.potx
```

Every position, color, font size, and layout name in this file was extracted from that `.potx`'s OOXML. **When the template is refreshed, re-extract — do not improvise.** A short re-extraction recipe is at the bottom of this file.

## When to use

- Any deck intended for Medtronic internal or client-facing audiences
- Restyling an existing deck to match MDT brand
- User mentions "Medtronic template", "MDT slide", "Quick Start template", or asks for slides that look like the Medtronic sample

## When NOT to use

- Generic decks, other brands, or personal projects
- Creative/marketing slides that need a looser aesthetic — the MDT template is deliberately structured

## Canvas

**16″ × 9″** custom widescreen (EMU `cx=14630400 cy=8229600`). This is **not** `LAYOUT_WIDE` (13.333×7.5).

In `pptxgenjs`, define the layout explicitly:

```javascript
pres.defineLayout({ name: "MDT_16x9", width: 16, height: 9 });
pres.layout = "MDT_16x9";
```

All positions below assume this canvas.

## Color palette

The template ships two color schemes — **Medtronic Theme (Light)** and **Medtronic Theme – Dark**. Pick one per deck and stay consistent.

### Medtronic Theme – Light (default)

| Role | Hex | Notes |
|---|---|---|
| **Deep Navy** | `140F4B` | Slide titles, primary brand color, divider backgrounds, table headers |
| **Electric Blue** | `1010EB` | Hyperlinks, "Electric Blue" cover, emphasis, RAG/secondary accent |
| **Charcoal (body)** | `3C3C3C` | Body copy, captions — **not** pure black |
| **White** | `FFFFFF` | Page background, reversed text on navy |

### Medtronic Theme – Dark

| Role | Hex | Notes |
|---|---|---|
| **Deep Navy** | `140F4B` | Page background |
| **White** | `FFFFFF` | Title and body text |
| **Sky Blue (link)** | `4A7DFF` | Hyperlinks, accent on dark |
| **Magenta (visited link)** | `DD57D4` | Followed link state |
| **Light gray (lt2)** | `F2F2F2` | Subtle reversed surfaces |

### Brand accents (data, charts, highlights — both themes)

| Token | Hex | Typical use |
|---|---|---|
| `accent.cyan` | `0FC9F7` | Primary chart series, key callouts |
| `accent.mint` | `00DCB9` | Secondary series, positive trends |
| `accent.green` | `7ECA2A` | Status: GREEN / on-track |
| `accent.amber` | `FFAD00` | Status: AMBER / at-risk |
| `accent.red` | `ED002A` | Status: RED / off-track |
| `accent.magenta` | `E5057F` | Highlight, exception callout |

The accents are mutually distinguishable and brand-on. **Do not introduce other colors.** When you need additional series, dim a brand accent (e.g., 60% opacity) rather than picking a new hue.

## Typography

**Brand font:** `Avenir Next World` (with `Avenir Next World Demi` for emphasis and `Avenir Next World Thin` for delicate weights). Avenir Next World is rarely available in headless render environments.

**Fallback chain (in order):** `Avenir Next World, Arial, Calibri, sans-serif`. Arial is the canonical fallback the template itself ships alongside Avenir; prefer it over Calibri because its geometry is closer to Avenir.

| Element | Size | Weight | Color (Light) | Color (Dark) |
|---|---|---|---|---|
| Slide title | 28pt | Regular | Deep Navy `140F4B` | White `FFFFFF` |
| Subtitle (eyebrow above title, on covers) | 14pt | Regular | Charcoal `3C3C3C` | White `FFFFFF` |
| Subtitle (under title, content slides) | 14pt | Regular | Charcoal `3C3C3C` | White `FFFFFF` |
| Body / bullets | 20pt | Regular | Charcoal `3C3C3C` | White `FFFFFF` |
| Section / column header | 18pt | Demi/Bold | Electric Blue `1010EB` | Sky Blue `4A7DFF` |
| Cover title | 60–72pt | Regular | Deep Navy `140F4B` (Light Cover) / White (Dark/Electric Blue Cover) | — |
| Divider title | 54–60pt | Regular | White on Electric Blue / Deep Navy | — |
| Table header | 14pt | Demi/Bold | White on `140F4B` | White on `140F4B` |
| Table body | 13pt | Regular | Charcoal | White |
| Footer text | 10pt | Regular | Charcoal `3C3C3C` | White `FFFFFF` |
| Page number | 10pt | Regular | Charcoal `3C3C3C` | White `FFFFFF` |
| Source line | 9pt | Regular | Charcoal `3C3C3C` | White `FFFFFF` |

**Titles are NOT bold.** This is the single most distinctive MDT type choice — bold titles immediately read as off-brand. Use `Avenir Next World Demi` for emphasis (column headers, table headers) when bold is needed.

## Standard frame (apply to every content slide)

Positions in inches on a 16×9 canvas. Numbers are extracted from `slideMaster1` and the most common layouts (`Content`, `2 Col Header and Content`, `Title with Subtitle`, `Title Only`, `Table`).

```
┌────────────────────────────────────────────────────────────────────┐
│  Title (navy, 28pt, regular)                          y=0.48        │
│  Subtitle (charcoal, 14pt)                            y=0.95        │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                                                           │     │
│   │            Content area                                  │     │
│   │            x: 0.78    w: 14.44                            │     │
│   │            y: 1.67    h: 6.20                             │     │
│   │                                                           │     │
│   │                                                           │     │
│   │                                                           │     │
│   └──────────────────────────────────────────────────────────┘     │
│  Source line (9pt, optional)                          y=8.05        │
│                                                                     │
│  9   Presentation title  |  Month ##, 20##  |  Internal use only    │
│  ↑                                                  [MEDTRONIC]     │
│  page #                                                wordmark     │
└────────────────────────────────────────────────────────────────────┘
```

### Exact positions (inches)

| Element | x | y | w | h |
|---|---|---|---|---|
| Title | 0.78 | 0.48 | 14.44 | 0.44 |
| Subtitle | 0.78 | 0.95 | 14.44 | 0.40 |
| Content area | 0.78 | 1.67 | 14.44 | 6.20 |
| Source line (optional) | 0.78 | 8.05 | 11.99 | 0.15 |
| Page number | 0.78 | 8.38 | 0.33 | 0.17 |
| Footer text | 1.26 | 8.38 | 11.51 | 0.17 |
| Wordmark graphic | 13.69 | 8.31 | 1.53 | 0.25 |

The footer is **a thin strip of small text** — there is no horizontal rule above it, no colored band, no decorative divider. Restraint is part of the brand identity.

## Layout catalog

The template defines 49 named slide layouts across two masters. The most-used are below; full list at the end of this file.

### Cover / opening (pick one per deck)

| Layout name | Style | Use when |
|---|---|---|
| `Electric Blue Cover` | Solid `1010EB` background, white title | Bold openers, big launches |
| `Dark Cover 1`–`4` | Deep navy backgrounds, white title | Default executive cover |
| `Light Cover 2`–`4` | White background, navy title, accent imagery | Conservative / data-heavy decks |
| `Title with Background Image` | Full-bleed photo, overlaid title | Branded keynote-style openers |

Cover slides include placeholders for: optional eyebrow (`y=2.6`), main title (`y=3.29`), subtitle (`y=6.04`), and a date + author block (`y=7.78` and `y=8.11`).

### Section dividers

| Layout name | Use when |
|---|---|
| `Divider: Electric Blue` | Standard section break (electric-blue background, white title at `y=3.06`) |
| `Divider white text` | Section break on dark navy |
| `Divider with Background Image` | Section break with imagery |

### Content workhorses

| Layout name | Pattern |
|---|---|
| `Title Only` | Title + footer; content area empty for custom shapes |
| `Title with Subtitle` | Title + subtitle, no body placeholder |
| `Content` | Title + subtitle + single content area (`14.44 × 6.20`) |
| `2 Col Content` | Title + two equal columns |
| `2 Col Header and Content` | Title + two columns, each with its own header band |
| `3 Col Content` / `4 Col Content` | Three- and four-column variants |
| `Table` | Title + table placeholder occupying the full content area |

### 2-column grid (most common content layout)

From `slideLayout28` (`2 Col Header and Content`):

| Slot | x | y | w | h |
|---|---|---|---|---|
| Column 1 header | 0.78 | 1.68 | 6.96 | 0.61 |
| Column 1 body | 0.78 | 2.47 | 6.96 | 5.40 |
| Column 2 header | 8.25 | 1.68 | 6.96 | 0.61 |
| Column 2 body | 8.25 | 2.47 | 6.96 | 5.40 |

Gap between columns: `0.51″`. Column headers use Electric Blue, ~18pt, Demi.

## Tables

Follow the MDT table pattern exactly:

- **Header row**: Deep Navy fill `140F4B`, white text, Demi/bold, centered, height ≈ 0.5″
- **Body rows**: Alternating white / `F2F2F2` fill, charcoal `3C3C3C` text, centered, height ≈ 0.55–0.7″
- **Borders**: Thin horizontal rules only (`D9D9D9`, 0.75pt); no vertical borders, no outer box
- **First column**: Left-aligned only when it's a true row label; centered is the standard

```javascript
const NAVY = '140F4B';
const CHARCOAL = '3C3C3C';
const ROW_ALT = 'F2F2F2';

const headerRow = columns.map((c) => ({
  text: c.label,
  options: { fill: { color: NAVY }, color: 'FFFFFF', bold: true, align: 'center', valign: 'middle' },
}));

const bodyRow = (cells, rowIdx) => cells.map((text) => ({
  text,
  options: {
    fill: { color: rowIdx % 2 === 0 ? 'FFFFFF' : ROW_ALT },
    color: CHARCOAL,
    align: 'center',
    valign: 'middle',
  },
}));
```

## RAG / status indicators

Use the brand accents — they double as status colors and stay on-palette.

| Status | Hex |
|---|---|
| GREEN / on-track | `7ECA2A` |
| AMBER / at-risk | `FFAD00` |
| RED / off-track | `ED002A` |

Render as small filled circles (0.22″ diameter) with the label text in the same color, 10pt, Demi. Keep these subtle — they should read as data, not alarm design.

```javascript
slide.addShape(pres.shapes.OVAL, { x, y, w: 0.22, h: 0.22, fill: { color: RED }, line: { color: RED, width: 0 } });
slide.addText('RED', { x: x + 0.3, y: y - 0.04, fontSize: 10, bold: true, color: RED, fontFace: 'Avenir Next World, Arial, Calibri' });
```

## Footer

Always include the standard footer. Format:

```
{pageNum}   Presentation title (edit on slide master)   |   Month ##, 20##   |   Internal use only       [Medtronic wordmark]
```

The `(edit on slide master)` phrasing is intentional — it mirrors the real template placeholder so users know where to customize. Keep the three-pipe separator with non-breaking spaces (`   |   `) for visual rhythm.

## Wordmark

The template embeds the official Medtronic wordmark graphic at `(13.69, 8.31)` w=1.53 h=0.25 — a thin horizontal lockup at bottom-right.

When generating slides programmatically and the wordmark image is unavailable, render `Medtronic` as text in Avenir Next World Demi (or Arial Bold), ~14pt, Deep Navy `140F4B` on light backgrounds / White on dark backgrounds, at the same position. **Add an inline comment in the script reminding the user to swap in the official wordmark asset before final distribution.**

The wordmark asset can be extracted from the template at `ppt/media/image*.png` if needed. Treat the official mark as proprietary — do not redraw it from scratch.

## Things to avoid

- **Bold titles** — slide titles are always Regular weight (use Demi only on column/table headers)
- **Pure black text** — body copy is Charcoal `#3C3C3C`, not `#000000`
- **`LAYOUT_WIDE` (13.333 × 7.5)** — the canvas is 16 × 9; using the wrong size shifts every position
- **Off-brand colors** — stick to navy / electric blue / charcoal / six accents; no introducing brand-adjacent hues
- **Decorative top bars or rule lines** — the template has none
- **Centered body prose** — body text is left-aligned; only table cells, titles, and column headers are centered
- **Mixing light and dark masters mid-deck** — pick one and commit
- **The old 1C1F4D / 1E22AA palette** — that was the previous MDT template; it is no longer correct

## QA checklist

After building, verify each slide:

1. Canvas is 16 × 9 inches (not `LAYOUT_WIDE`)
2. Title is Regular weight, ~28pt, Deep Navy `140F4B` (light) or White (dark)
3. Body text is Charcoal `3C3C3C` (not black), 20pt
4. Font is `Avenir Next World, Arial, Calibri` chain
5. Footer has page number at `x=0.78, y=8.38`, footer text at `x=1.26, y=8.38`
6. Wordmark graphic or "Medtronic" text at `x=13.69, y=8.31`
7. Tables: navy headers, alternating-row body, horizontal-rule-only borders
8. Color usage is restricted to the palette in this file
9. No decorative bars, accent strips, or rule lines beyond what the template defines
10. Single master used throughout (light *or* dark, not mixed)

## Layout reference (full list)

Extracted from the template, in order. Use the layout name as your reference when picking layouts in `pptxgenjs` (or rebuilding manually):

```
Dark Cover 1 / 2 / 3 / 4
Electric Blue Cover
Light Cover 2 / 3 / 4
Title with Image
Light Cover with Symbol
Title with Circular Photo
Title with Background Image
Divider: Electric Blue
Divider white text
Divider
Divider with Background Image
Divider with Symbol 2
Agenda 3
Title Only
Title with Subtitle
Blank
Content
2 Col Content
3 Col Content
4 Col Content
2 Col Intro Content (1 box variant)
2 Col Header and Content
3 Col Header and Content
4 Col Header and Content
5 Col Header and Content
4 Items with Feature Headers
4 Items
6 Items
Quote
Full Background Image
Full Width Image
Content with Header and Circular Image
Content with Circular Image
Content with Monitor Screen
5 Icon
Content with Header and Left Anchored Image
Content with Header and Right Anchored Image
Process Diagram
Table
Title
```

## Implementation drift (flag for follow-up)

`lib/export/mdt-theme.ts`, `lib/export/slide-frame.ts`, the renderers under `lib/export/slides/*.tsx`, and several tests under `__tests__/lib/export/` were tuned to the **previous** Medtronic template (palette `1C1F4D` / `1E22AA`, canvas `LAYOUT_WIDE` 13.333×7.5, title 32pt). They will produce slides that no longer match the brand specified above.

When migrating those modules to this template, expect to update:

- `MDT_COLORS` → new navy `140F4B`, electric blue `1010EB`, charcoal `3C3C3C`, plus the six accents
- `MDT_TYPO` → title 28pt, body 20pt, table header 14pt
- `MDT_LAYOUT` → recalculate every position against the 16×9 canvas (most x-values shift outward; footer y moves from 7.15 → 8.38; content top from 1.6 → 1.67)
- `MDT_FONT` → `'Avenir Next World, Arial, Calibri'` chain
- Tests asserting specific hex/positions will need new fixtures

This skill is the source of truth — code follows it, not the other way around.

## Re-extraction recipe

When a new `.potx` is provided:

1. Copy the template to `assets/templates/mdt-quick-start-{YYYY-MM}.potx`
2. Treat `.potx` as a zip; extract to a temp dir
3. From `ppt/presentation.xml` read `p:sldSz` (canvas dimensions in EMU; divide by 914400 for inches)
4. From each `ppt/theme/theme*.xml` read `a:clrScheme` (dk1/lt1/dk2/lt2/accent1–6) and `a:fontScheme` (major/minor `latin` typeface)
5. From `ppt/slideMasters/slideMaster1.xml` read title/body `defRPr` (size in 100ths of pt; weight via `b="1"`)
6. From `ppt/slideLayouts/slideLayout*.xml` read each shape's `p:spPr/a:xfrm` (`off` and `ext` in EMU) — these are the canonical positions for that layout
7. Cross-check against a few sample slides (`ppt/slides/slide*.xml`) to confirm the layouts are used as intended
8. Update this file with observed values; flag implementation drift in `lib/export/`

This skill was generated from `mdt-quick-start-2026-02.potx` on 2026-04-29.
