import type PptxGenJS from 'pptxgenjs';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { BugBurndownChart } from '@/components/Dashboard/BugBurndownChart';
import { renderChartToPng } from '../render/chart-image';

const CHART_X = 0.3;
const CHART_Y = 0.85;
const CHART_W = 8.5;
const CHART_H = 5.5;
const PANEL_X = 9.2;
const PANEL_Y = 0.85;
const PANEL_W = 3.9;

export async function buildBugBurndownSlide(
  prs: InstanceType<typeof PptxGenJS>,
  ws: WorkstreamCardViewModel
): Promise<void> {
  const slide = prs.addSlide();

  slide.addText(`${ws.workstreamName} — Bug Burndown`, {
    x: 0.3,
    y: 0.1,
    w: 12.7,
    h: 0.55,
    fontSize: 18,
    bold: true,
    color: '333333',
  });

  if (ws.trendSprints.length === 0) {
    slide.addText('No bug data available', {
      x: 1,
      y: 3,
      w: 11,
      h: 1,
      fontSize: 16,
      color: '868e96',
      align: 'center',
    });
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
    slide.addImage({ data: dataUrl, x: CHART_X, y: CHART_Y, w: CHART_W, h: CHART_H });
  } catch (err) {
    console.error(`[pptx-export] bug burndown chart capture failed for "${ws.workstreamName}":`, err);
    slide.addText('Chart unavailable', {
      x: CHART_X,
      y: CHART_Y,
      w: CHART_W,
      h: CHART_H,
      fontSize: 16,
      color: '868e96',
      align: 'center',
    });
  }

  const currentSprint = ws.trendSprints.find((s) => s.isCurrent);

  const metricLines: Array<[string, string]> = [
    ['Open (current)', currentSprint ? String(currentSprint.rawActiveBugs) : '–'],
    ['Closed (current)', currentSprint ? String(currentSprint.rawBugsClosed) : '–'],
    ['Open total (trend)', String(ws.trendSprints.reduce((sum, s) => sum + s.rawActiveBugs, 0))],
    ['Closed total (trend)', String(ws.trendSprints.reduce((sum, s) => sum + s.rawBugsClosed, 0))],
  ];

  metricLines.forEach(([label, val], i) => {
    const y = PANEL_Y + i * 0.65;
    slide.addText(label, {
      x: PANEL_X,
      y,
      w: PANEL_W,
      h: 0.3,
      fontSize: 10,
      color: '888888',
    });
    slide.addText(val, {
      x: PANEL_X,
      y: y + 0.28,
      w: PANEL_W,
      h: 0.35,
      fontSize: 14,
      color: '333333',
      bold: true,
    });
  });
}
