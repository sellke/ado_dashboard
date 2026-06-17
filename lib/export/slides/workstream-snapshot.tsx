import type PptxGenJS from 'pptxgenjs';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { ragColor } from '../rag-colors';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type { ExportInput, ExportWorkstreamSnapshot } from '../types';

const CARD_W = 5.7;
const CARD_H = 2.35;
const CARD_GAP_X = 0.35;
const CARD_GAP_Y = 0.25;
const CARDS_PER_ROW = 2;
const CARDS_PER_SLIDE = 4;
const CONTENT_LEFT = 0.7;

function truncateLabel(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

function renderSnapshotCard(
  slide: PptxGenJS.Slide,
  card: ExportWorkstreamSnapshot,
  x: number,
  y: number
): void {
  const statusColor = ragColor(card.statusCue);

  slide.addShape('rect' as Parameters<typeof slide.addShape>[0], {
    x,
    y,
    w: CARD_W,
    h: CARD_H,
    fill: { color: MDT_COLORS.white },
    line: { color: MDT_COLORS.rule, pt: 1 },
  });

  slide.addShape('rect' as Parameters<typeof slide.addShape>[0], {
    x,
    y,
    w: 0.12,
    h: CARD_H,
    fill: { color: statusColor },
    line: { color: statusColor },
  });

  slide.addText(truncateLabel(card.workstreamName, 28), {
    x: x + 0.2,
    y: y + 0.1,
    w: CARD_W - 0.3,
    h: 0.35,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.bodyPt,
    color: MDT_COLORS.navy,
    bold: true,
  });

  const metricLines = card.keyMetrics
    .slice(0, 5)
    .map((m) => `${m.label}: ${m.value}${m.rag ? ` (${m.rag})` : ''}`)
    .join('\n');

  slide.addText(metricLines || 'No metrics available', {
    x: x + 0.2,
    y: y + 0.5,
    w: CARD_W - 0.3,
    h: 1.2,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.tableBodyPt,
    color: MDT_COLORS.black,
    valign: 'top',
  });

  const caveat = card.primaryCaveat ?? 'No caveats';
  slide.addText(truncateLabel(caveat, 72), {
    x: x + 0.2,
    y: y + 1.75,
    w: CARD_W - 0.3,
    h: 0.45,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.statusLabelPt,
    color: MDT_COLORS.bodyMuted,
    italic: true,
  });
}

export async function buildWorkstreamSnapshotSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  cards: ExportWorkstreamSnapshot[],
  pageLabel?: string
): Promise<void> {
  const slide = prs.addSlide();
  const subtitle = pageLabel ?? 'Visible dashboard scope';
  addMdtTitleBlock(slide, { title: 'Workstream Health Snapshot', subtitle });
  const contentTop = mdtContentTop(true);

  if (cards.length === 0) {
    slide.addText('No workstreams in the current dashboard scope.', {
      x: CONTENT_LEFT,
      y: contentTop + 1.5,
      w: 11.9,
      h: 0.8,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.bodyMuted,
      align: 'center',
    });
    addMdtFooter(slide, ctx, input);
    return;
  }

  cards.forEach((card, index) => {
    const col = index % CARDS_PER_ROW;
    const row = Math.floor(index / CARDS_PER_ROW);
    const x = CONTENT_LEFT + col * (CARD_W + CARD_GAP_X);
    const y = contentTop + row * (CARD_H + CARD_GAP_Y);
    renderSnapshotCard(slide, card, x, y);
  });

  addMdtFooter(slide, ctx, input);
}

export { CARDS_PER_SLIDE as WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE };
