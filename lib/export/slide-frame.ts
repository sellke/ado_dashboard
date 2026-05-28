import type PptxGenJS from 'pptxgenjs';
import {
  DEFAULT_PRESENTATION_TITLE,
  MDT_COLORS,
  MDT_FONT,
  MDT_LAYOUT,
  MDT_TYPO,
  truncateForFooter,
} from './mdt-theme';
import type { ExportInput } from './types';

type Slide = PptxGenJS.Slide;

export type MdtSlideContext = {
  /** 1-based slide index */
  slideIndex: number;
  totalSlides: number;
};

const FOOTER_TITLE_MAX = 42;

export type MdtTitleBlock = {
  title: string;
  /** When null/undefined/empty, subtitle shapes are skipped and content top uses the tighter band */
  subtitle?: string | null;
};

/**
 * Slide title (32pt regular navy) and optional subtitle (14pt bold black).
 */
export function addMdtTitleBlock(slide: Slide, block: MdtTitleBlock): void {
  slide.addText(block.title, {
    ...MDT_LAYOUT.title,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.slideTitlePt,
    bold: false,
    color: MDT_COLORS.navy,
    valign: 'middle',
  });

  const sub = block.subtitle?.trim();
  if (!sub) return;

  slide.addText(sub, {
    ...MDT_LAYOUT.subtitle,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.subtitlePt,
    bold: true,
    color: MDT_COLORS.black,
    valign: 'middle',
  });
}

function formatFooterDateLine(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * Page # (left), metadata line, Medtronic wordmark text (no bundled image — text fallback per spec).
 */
export function addMdtFooter(slide: Slide, ctx: MdtSlideContext, _input: ExportInput): void {
  const pageStr = String(ctx.slideIndex);

  slide.addText(pageStr, {
    x: MDT_LAYOUT.footerPageX,
    y: MDT_LAYOUT.footerY,
    w: 0.45,
    h: 0.3,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.footerPt,
    color: MDT_COLORS.bodyMuted,
    valign: 'middle',
  });

  const meta = `${truncateForFooter(DEFAULT_PRESENTATION_TITLE, FOOTER_TITLE_MAX)} | ${formatFooterDateLine()} | Internal use only`;

  slide.addText(meta, {
    x: MDT_LAYOUT.footerMetaX,
    y: MDT_LAYOUT.footerY,
    w: MDT_LAYOUT.footerMetaW,
    h: 0.35,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.footerPt,
    color: MDT_COLORS.bodyMuted,
    valign: 'middle',
  });

  slide.addText('Medtronic', {
    ...MDT_LAYOUT.wordmark,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.footerPt,
    color: MDT_COLORS.navy,
    align: 'right',
    valign: 'middle',
  });
}
