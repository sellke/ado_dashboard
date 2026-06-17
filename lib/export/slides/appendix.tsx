import type PptxGenJS from 'pptxgenjs';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { addEmptyDataPanel } from '../placeholders';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type {
  ExportCycleTimeSection,
  ExportDataCaveat,
  ExportInput,
  ExportMilestoneContext,
  ExportRollingMetricSection,
} from '../types';

const LEFT = 0.7;
const WIDTH = 11.9;

function addTableHeader(slide: PptxGenJS.Slide, y: number, columns: string[]): number {
  const colW = WIDTH / columns.length;
  columns.forEach((col, i) => {
    slide.addText(col, {
      x: LEFT + i * colW,
      y,
      w: colW,
      h: 0.35,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.tableHeaderPt,
      color: MDT_COLORS.navy,
      bold: true,
    });
  });
  return y + 0.4;
}

export async function buildRollingMetricAppendixSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  sections: ExportRollingMetricSection[]
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, {
    title: 'Rolling Metrics Detail',
    subtitle: 'Per-sprint values and rolling context',
  });
  const contentTop = mdtContentTop(true);
  let y = contentTop;

  if (sections.length === 0) {
    addEmptyDataPanel(slide, 'No rolling metric appendix data is available.', { y: y + 1.2 });
    addMdtFooter(slide, ctx, input);
    return;
  }

  for (const section of sections.slice(0, 4)) {
    slide.addText(`${section.scopeLabel} — ${section.metricLabel} (${section.summaryValue})`, {
      x: LEFT,
      y,
      w: WIDTH,
      h: 0.35,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.black,
      bold: true,
    });
    y += 0.4;
    if (section.rollingWindowLabel) {
      slide.addText(section.rollingWindowLabel, {
        x: LEFT,
        y,
        w: WIDTH,
        h: 0.25,
        fontFace: MDT_FONT,
        fontSize: MDT_TYPO.statusLabelPt,
        color: MDT_COLORS.bodyMuted,
      });
      y += 0.3;
    }
    y = addTableHeader(slide, y, ['Sprint', 'Value', 'Rolling Avg']);
    for (const row of section.rows.slice(0, 4)) {
      const colW = WIDTH / 3;
      const values = [row.sprintName, row.value, row.rollingAverageValue ?? 'N/A'];
      values.forEach((val, i) => {
        slide.addText(val, {
          x: LEFT + i * colW,
          y,
          w: colW,
          h: 0.3,
          fontFace: MDT_FONT,
          fontSize: MDT_TYPO.tableBodyPt,
          color: MDT_COLORS.black,
        });
      });
      y += 0.32;
    }
    y += 0.2;
  }

  addMdtFooter(slide, ctx, input);
}

export async function buildCycleTimeAppendixSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  sections: ExportCycleTimeSection[]
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, { title: 'Cycle Time Context', subtitle: 'Averages and unavailable counts' });
  const contentTop = mdtContentTop(true);
  let y = contentTop;

  if (sections.length === 0) {
    addEmptyDataPanel(slide, 'Cycle-time appendix data is not available.', { y: y + 1.2 });
    addMdtFooter(slide, ctx, input);
    return;
  }

  for (const section of sections.slice(0, 3)) {
    slide.addText(section.scopeLabel, {
      x: LEFT,
      y,
      w: WIDTH,
      h: 0.35,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      bold: true,
      color: MDT_COLORS.navy,
    });
    y += 0.4;
    y = addTableHeader(slide, y, ['Type', 'Average', 'Completed', 'Unavailable']);
    for (const row of section.typeRows) {
      const colW = WIDTH / 4;
      const values = [
        row.typeLabel,
        row.averageLabel,
        String(row.completedItemCount),
        row.unavailableItemCount > 0 ? String(row.unavailableItemCount) : '0',
      ];
      values.forEach((val, i) => {
        slide.addText(val, {
          x: LEFT + i * colW,
          y,
          w: colW,
          h: 0.3,
          fontFace: MDT_FONT,
          fontSize: MDT_TYPO.tableBodyPt,
          color: MDT_COLORS.black,
        });
      });
      y += 0.32;
    }
    if (section.caveat) {
      slide.addText(section.caveat, {
        x: LEFT,
        y,
        w: WIDTH,
        h: 0.35,
        fontFace: MDT_FONT,
        fontSize: MDT_TYPO.statusLabelPt,
        color: MDT_COLORS.bodyMuted,
        italic: true,
      });
      y += 0.45;
    }
    y += 0.15;
  }

  addMdtFooter(slide, ctx, input);
}

export async function buildMilestoneContextAppendixSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  context: ExportMilestoneContext | null | undefined
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, {
    title: 'Milestone and Data Coverage',
    subtitle: 'Rollup context and sparse-data notes',
  });
  const contentTop = mdtContentTop(true);
  let y = contentTop;

  if (!context) {
    addEmptyDataPanel(slide, 'Milestone rollup context is not available.', { y: y + 1.2 });
    addMdtFooter(slide, ctx, input);
    return;
  }

  const lines = [
    context.monthlyRollupLabel,
    context.quarterlyRollupLabel,
    context.sparseDataCaveat,
  ].filter(Boolean) as string[];

  slide.addText(lines.join('\n'), {
    x: LEFT,
    y,
    w: WIDTH,
    h: 1.2,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.bodyPt,
    color: MDT_COLORS.black,
    valign: 'top',
  });

  addMdtFooter(slide, ctx, input);
}

export async function buildPartialDataAppendixSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  caveats: ExportDataCaveat[]
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, {
    title: 'Data Coverage Notes',
    subtitle: 'Partial or missing export inputs',
  });
  const contentTop = mdtContentTop(true);

  if (caveats.length === 0) {
    addEmptyDataPanel(slide, 'No data coverage caveats were recorded for this export.', {
      y: contentTop + 1.2,
    });
    addMdtFooter(slide, ctx, input);
    return;
  }

  const lines = caveats.map((c) => `[${c.severity.toUpperCase()}] ${c.scopeLabel}: ${c.message}`);
  slide.addText(lines.join('\n'), {
    x: LEFT,
    y: contentTop,
    w: WIDTH,
    h: 4.5,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.tableBodyPt,
    color: MDT_COLORS.black,
    valign: 'top',
  });

  addMdtFooter(slide, ctx, input);
}
