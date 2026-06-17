/**
 * Medtronic export theme for pptxgenjs (browser). Normative rules:
 * `.cursor/skills/mdt_slides.md`. Avenir Next is brand intent; Calibri is the runtime face.
 */

export const MDT_FONT = 'Calibri' as const;

/** Hex without `#` — pptxgenjs convention */
export const MDT_COLORS = {
  navy: '1C1F4D',
  blue: '1E22AA',
  black: '000000',
  bodyMuted: '5A5A5A',
  rowAlt: 'F2F2F2',
  rule: 'D9D9D9',
  white: 'FFFFFF',
} as const;

export const MDT_TYPO = {
  slideTitlePt: 32,
  subtitlePt: 14,
  sectionHeaderPt: 28,
  bodyPt: 14,
  tableHeaderPt: 14,
  tableBodyPt: 13,
  footerPt: 10,
  /** RAG / status indicator labels (skill) */
  statusLabelPt: 10,
} as const;

/** `LAYOUT_WIDE` (13.33×7.5 in) — see `EXPORT_PRESENTATION_LAYOUT` in builder.ts for canvas decision. */
export const MDT_LAYOUT = {
  title: { x: 0.7, y: 0.35, w: 10, h: 0.6 },
  subtitle: { x: 0.7, y: 0.95, w: 10, h: 0.35 },
  contentLeft: 0.7,
  contentRight: 12.6,
  contentWidth: 11.9,
  /** Content starts below title block when subtitle present */
  contentTopWithSubtitle: 1.6,
  /** When subtitle omitted, reclaim vertical space */
  contentTopNoSubtitle: 1.45,
  footerY: 7.15,
  footerPageX: 0.4,
  footerMetaX: 0.9,
  footerMetaW: 10.2,
  wordmark: { x: 11.4, y: 7.05, w: 1.5, h: 0.35 },
} as const;

export const DEFAULT_PRESENTATION_TITLE = 'LiveLink Health Report';

export function mdtContentTop(hasSubtitle: boolean): number {
  return hasSubtitle ? MDT_LAYOUT.contentTopWithSubtitle : MDT_LAYOUT.contentTopNoSubtitle;
}

/** Truncate long strings for footer metadata */
export function truncateForFooter(s: string, maxLen: number): string {
  const t = s.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}
