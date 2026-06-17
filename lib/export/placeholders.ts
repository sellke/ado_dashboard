import type PptxGenJS from 'pptxgenjs';
import { MDT_COLORS, MDT_FONT, MDT_TYPO } from './mdt-theme';

type Slide = PptxGenJS.Slide;

/** Readable placeholder when a Recharts capture fails. */
export function addChartUnavailablePlaceholder(
  slide: Slide,
  opts: { x: number; y: number; w: number; h: number; detail?: string }
): void {
  slide.addShape('rect' as Parameters<typeof slide.addShape>[0], {
    x: opts.x,
    y: opts.y,
    w: opts.w,
    h: opts.h,
    fill: { color: MDT_COLORS.rowAlt },
    line: { color: MDT_COLORS.rule, pt: 1 },
  });
  slide.addText('Chart unavailable', {
    x: opts.x,
    y: opts.y + opts.h / 2 - 0.35,
    w: opts.w,
    h: 0.4,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.bodyPt,
    color: MDT_COLORS.bodyMuted,
    align: 'center',
    bold: true,
  });
  if (opts.detail) {
    slide.addText(opts.detail, {
      x: opts.x + 0.2,
      y: opts.y + opts.h / 2 + 0.05,
      w: opts.w - 0.4,
      h: 0.5,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.statusLabelPt,
      color: MDT_COLORS.bodyMuted,
      align: 'center',
    });
  }
}

/** Centered empty-state copy for slides missing metric or trend data. */
export function addEmptyDataPanel(
  slide: Slide,
  message: string,
  opts: { x?: number; y: number; w?: number; h?: number }
): void {
  slide.addText(message, {
    x: opts.x ?? 0.7,
    y: opts.y,
    w: opts.w ?? 11.9,
    h: opts.h ?? 0.9,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.bodyPt,
    color: MDT_COLORS.bodyMuted,
    align: 'center',
    valign: 'middle',
  });
}
