import type PptxGenJS from 'pptxgenjs';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { ragColor } from '../rag-colors';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type { ExportInput } from '../types';

const TILE_W = 2.35;
const TILE_H = 1.4;
const TILE_GAP = 0.15;
const SLIDE_W = 13.33;

function formatRagStrip(counts: NonNullable<ExportInput['visualizationSummary']>['ragCounts']): string {
  return `Green: ${counts.green}  |  Amber: ${counts.amber}  |  Red: ${counts.red}  |  Unset: ${counts.unset}`;
}

export async function buildProgramSnapshotSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext
): Promise<void> {
  const slide = prs.addSlide();
  const summary = input.visualizationSummary;
  const subtitleParts = [
    summary?.sprintWindowLabel ?? input.sprintName,
    summary?.computedDateLabel,
  ].filter(Boolean);
  const subtitle = subtitleParts.join(' · ') || null;

  addMdtTitleBlock(slide, { title: 'Program Health Snapshot', subtitle });
  const contentTop = mdtContentTop(!!subtitle);

  if (!summary && !input.programMetrics) {
    slide.addText('Program health data is not yet available.', {
      x: 0.7,
      y: contentTop + 1.5,
      w: 11.5,
      h: 0.8,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.bodyMuted,
      align: 'center',
    });
    addMdtFooter(slide, ctx, input);
    return;
  }

  const healthLabel = summary?.healthLabel ?? 'Status Unavailable';
  slide.addShape('rect' as Parameters<typeof slide.addShape>[0], {
    x: 0.7,
    y: contentTop,
    w: 11.9,
    h: 0.55,
    fill: { color: MDT_COLORS.navy },
    line: { color: MDT_COLORS.navy },
  });
  slide.addText(`${healthLabel} — ${summary ? formatRagStrip(summary.ragCounts) : 'Metrics loading'}`, {
    x: 0.85,
    y: contentTop + 0.08,
    w: 11.5,
    h: 0.4,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.bodyPt,
    color: MDT_COLORS.white,
    valign: 'middle',
  });

  const metrics = input.programMetrics ?? [];
  const tileCount = Math.min(metrics.length, 5);
  const tileStartX =
    tileCount > 0 ? (SLIDE_W - tileCount * TILE_W - (tileCount - 1) * TILE_GAP) / 2 : 0.7;
  const tileY = contentTop + 0.75;

  metrics.slice(0, 5).forEach((m, i) => {
    const x = tileStartX + i * (TILE_W + TILE_GAP);
    const color = ragColor(m.rag);
    slide.addShape('rect' as Parameters<typeof slide.addShape>[0], {
      x,
      y: tileY,
      w: TILE_W,
      h: TILE_H,
      fill: { color },
      line: { color },
    });
    slide.addText(m.label, {
      x,
      y: tileY + 0.1,
      w: TILE_W,
      h: 0.35,
      fontFace: MDT_FONT,
      fontSize: 10,
      color: MDT_COLORS.white,
      align: 'center',
    });
    slide.addText(m.value, {
      x,
      y: tileY + 0.45,
      w: TILE_W,
      h: 0.75,
      fontFace: MDT_FONT,
      fontSize: 20,
      color: MDT_COLORS.white,
      align: 'center',
      bold: true,
    });
  });

  const risks = summary?.topRiskItems ?? [];
  const caveats = summary?.caveats ?? [];
  const notesY = tileY + TILE_H + 0.35;
  const noteLines = [
    risks.length > 0 ? `Top risks: ${risks.join('; ')}` : null,
    ...caveats.map((c) => c),
  ].filter(Boolean) as string[];

  if (noteLines.length > 0) {
    slide.addText(noteLines.join('\n'), {
      x: 0.7,
      y: notesY,
      w: 11.9,
      h: 1.2,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.bodyMuted,
      valign: 'top',
    });
  }

  addMdtFooter(slide, ctx, input);
}
