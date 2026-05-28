import type PptxGenJS from 'pptxgenjs';
import { VelocityTrendChart } from '@/components/Dashboard/VelocityTrendChart';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { renderChartToPng } from '../render/chart-image';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type { ExportInput } from '../types';

const CHART_W = 8.5;
const CHART_H = 5.5;
const PANEL_X = 9.2;
const PANEL_W = 3.9;

export async function buildVelocitySlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  ws: WorkstreamCardViewModel
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, {
    title: `${ws.workstreamName} — Velocity`,
    subtitle: null,
  });

  const contentTop = mdtContentTop(false);
  const CHART_Y = contentTop + 0.1;
  const PANEL_Y = contentTop + 0.1;

  const sprints = ws.trendSprints;

  if (sprints.length === 0) {
    slide.addText('No trend data available', {
      x: 1,
      y: contentTop + 1.5,
      w: 11,
      h: 1,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.bodyMuted,
      align: 'center',
    });
    addMdtFooter(slide, ctx, input);
    return;
  }

  try {
    const dataUrl = await renderChartToPng(
      <VelocityTrendChart
        trendSprints={sprints}
        prediction={ws.prediction ?? null}
        animateSeries={false}
        width={850}
        height={550}
      />,
      { width: 850, height: 550 }
    );
    slide.addImage({ data: dataUrl, x: 0.3, y: CHART_Y, w: CHART_W, h: CHART_H });
  } catch (err) {
    console.error(`[pptx-export] velocity chart capture failed for "${ws.workstreamName}":`, err);
    slide.addText('Chart unavailable', {
      x: 0.3,
      y: CHART_Y,
      w: CHART_W,
      h: CHART_H,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.bodyPt,
      color: MDT_COLORS.bodyMuted,
      align: 'center',
    });
  }

  const velocityMetric = ws.metrics[0];
  const ragLabel = velocityMetric?.rag ?? '–';
  const currentVal = velocityMetric?.value ?? '–';
  const avgLabel = velocityMetric?.avgLabel ?? '–';
  const predicted = ws.prediction ? `${Math.round(ws.prediction.rawVelocity ?? 0)} SP` : '–';

  slide.addText('Metrics', {
    x: PANEL_X,
    y: PANEL_Y,
    w: PANEL_W,
    h: 0.35,
    fontFace: MDT_FONT,
    fontSize: MDT_TYPO.sectionHeaderPt,
    bold: false,
    color: MDT_COLORS.blue,
  });

  const metricLines = [
    ['Current Velocity', `${currentVal} SP`],
    ['Rolling Avg', `${avgLabel}`],
    ['RAG Status', ragLabel],
    ['Predicted Next', predicted],
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
      bold: false,
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
