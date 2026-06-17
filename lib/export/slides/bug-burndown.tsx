import type PptxGenJS from 'pptxgenjs';
import { BugBurndownChart } from '@/components/Dashboard/BugBurndownChart';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { addChartUnavailablePlaceholder, addEmptyDataPanel } from '../placeholders';
import { renderChartToPng } from '../render/chart-image';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type { ExportInput } from '../types';

const CHART_W = 8.5;
const CHART_H = 5.5;
const PANEL_X = 9.2;
const PANEL_W = 3.9;

export async function buildBugBurndownSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  ws: WorkstreamCardViewModel
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, {
    title: `${ws.workstreamName} — Bug Burndown`,
    subtitle: null,
  });

  const contentTop = mdtContentTop(false);
  const CHART_Y = contentTop + 0.1;
  const PANEL_Y = contentTop + 0.1;

  if (ws.trendSprints.length === 0) {
    addEmptyDataPanel(slide, 'Bug burndown data is not available for this workstream.', {
      y: contentTop + 1.5,
    });
    addMdtFooter(slide, ctx, input);
    return;
  }

  try {
    const dataUrl = await renderChartToPng(
      <BugBurndownChart
        trendSprints={ws.trendSprints}
        width={850}
        height={550}
        animateSeries={false}
      />,
      { width: 850, height: 550 }
    );
    slide.addImage({ data: dataUrl, x: 0.3, y: CHART_Y, w: CHART_W, h: CHART_H });
  } catch (err) {
    console.error(
      `[pptx-export] bug burndown chart capture failed for "${ws.workstreamName}":`,
      err
    );
    addChartUnavailablePlaceholder(slide, {
      x: 0.3,
      y: CHART_Y,
      w: CHART_W,
      h: CHART_H,
      detail: 'Bug burndown chart could not be captured from the dashboard.',
    });
  }

  const currentSprint = ws.trendSprints.find((s) => s.isCurrent);

  slide.addText('Summary', {
    x: PANEL_X,
    y: PANEL_Y,
    w: PANEL_W,
    h: 0.35,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.sectionHeaderPt,
    bold: false,
    color: MDT_COLORS.blue,
  });

  const metricLines: Array<[string, string]> = [
    ['Open (current)', currentSprint ? String(currentSprint.rawActiveBugs) : '–'],
    ['Closed (current)', currentSprint ? String(currentSprint.rawBugsClosed) : '–'],
    ['Open total (trend)', String(ws.trendSprints.reduce((sum, s) => sum + s.rawActiveBugs, 0))],
    ['Closed total (trend)', String(ws.trendSprints.reduce((sum, s) => sum + s.rawBugsClosed, 0))],
  ];

  metricLines.forEach(([label, val], i) => {
    const y = PANEL_Y + 0.45 + i * 0.65;
    slide.addText(label, {
      x: PANEL_X,
      y,
      w: PANEL_W,
      h: 0.3,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.statusLabelPt,
      color: MDT_COLORS.bodyMuted,
    });
    slide.addText(val, {
      x: PANEL_X,
      y: y + 0.28,
      w: PANEL_W,
      h: 0.35,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.black,
      bold: true,
    });
  });

  addMdtFooter(slide, ctx, input);
}
