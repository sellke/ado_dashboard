import type PptxGenJS from 'pptxgenjs';
import type { ApiMilestoneWithProgress } from '@/lib/milestones/types';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { BurnupChart } from '@/components/Dashboard/BurnupChart';
import { renderChartToPng } from '../render/chart-image';

const MAX_CHARTS = 3;
const CHART_H = 1.75;
const CHART_X = 0.3;
const CHART_W = 12.7;

function chartY(index: number): number {
  return 0.85 + index * (CHART_H + 0.25);
}

export async function buildMilestoneSlide(
  prs: InstanceType<typeof PptxGenJS>,
  ws: WorkstreamCardViewModel,
  milestones: ApiMilestoneWithProgress[]
): Promise<void> {
  const slide = prs.addSlide();

  slide.addText(`${ws.workstreamName} — Milestones`, {
    x: 0.3,
    y: 0.1,
    w: 12.7,
    h: 0.55,
    fontSize: 18,
    bold: true,
    color: '333333',
  });

  const wsMilestones = milestones.filter((m) => m.workstreamId === ws.workstreamId);

  if (wsMilestones.length === 0) {
    slide.addText('Milestone data unavailable for this workstream', {
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

  const charted = wsMilestones.slice(0, MAX_CHARTS);
  const textOnly = wsMilestones.slice(MAX_CHARTS);

  for (let i = 0; i < charted.length; i++) {
    const milestone = charted[i];
    const y = chartY(i);
    const pctLabel =
      milestone.percentComplete != null ? `${Math.round(milestone.percentComplete)}%` : '–';

    slide.addText(`${milestone.title}  ·  ${pctLabel} complete`, {
      x: CHART_X,
      y: y - 0.05,
      w: CHART_W,
      h: 0.25,
      fontSize: 9,
      color: '555555',
      bold: false,
    });

    if (!milestone.burnupData || milestone.burnupData.length === 0) {
      slide.addText(`${pctLabel} complete — no sprint data`, {
        x: CHART_X,
        y: y + 0.22,
        w: CHART_W,
        h: 0.5,
        fontSize: 12,
        color: '868e96',
        align: 'center',
      });
      continue;
    }

    try {
      const dataUrl = await renderChartToPng(
        <BurnupChart
          burnupData={milestone.burnupData}
          width={1270}
          height={160}
          animateSeries={false}
        />,
        { width: 1270, height: 180 }
      );
      slide.addImage({
        data: dataUrl,
        x: CHART_X,
        y: y + 0.2,
        w: CHART_W,
        h: CHART_H - 0.25,
      });
    } catch (err) {
      console.error(
        `[pptx-export] milestone burnup capture failed for "${ws.workstreamName}" / "${milestone.title}":`,
        err
      );
      slide.addText('Chart unavailable', {
        x: CHART_X,
        y: y + 0.22,
        w: CHART_W,
        h: 0.5,
        fontSize: 12,
        color: '868e96',
        align: 'center',
      });
    }
  }

  if (textOnly.length > 0) {
    const listY = chartY(MAX_CHARTS) + 0.1;
    const lines = textOnly
      .map((m) => {
        const pct = m.percentComplete != null ? `${Math.round(m.percentComplete)}%` : '–';
        return `· ${m.title}: ${pct} complete`;
      })
      .join('\n');

    slide.addText(lines, {
      x: CHART_X,
      y: listY,
      w: CHART_W,
      h: 0.8,
      fontSize: 10,
      color: '555555',
    });
  }
}
