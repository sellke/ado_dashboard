import type PptxGenJS from 'pptxgenjs';
import { BurnupChart } from '@/components/Dashboard/BurnupChart';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import type { ApiMilestoneWithProgress } from '@/lib/milestones/types';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { renderChartToPng } from '../render/chart-image';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type { ExportInput } from '../types';

const MAX_CHARTS = 3;
const CHART_H = 1.75;
const CHART_X = 0.3;
const CHART_W = 12.7;

function chartY(base: number, index: number): number {
  return base + index * (CHART_H + 0.25);
}

export async function buildMilestoneSlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext,
  ws: WorkstreamCardViewModel,
  milestones: ApiMilestoneWithProgress[]
): Promise<void> {
  const slide = prs.addSlide();
  addMdtTitleBlock(slide, {
    title: `${ws.workstreamName} — Milestones`,
    subtitle: null,
  });

  const contentTop = mdtContentTop(false);
  const baseY = contentTop + 0.05;

  const wsMilestones = milestones.filter((m) => m.workstreamId === ws.workstreamId);

  if (wsMilestones.length === 0) {
    slide.addText('Milestone data unavailable for this workstream', {
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

  const charted = wsMilestones.slice(0, MAX_CHARTS);
  const textOnly = wsMilestones.slice(MAX_CHARTS);

  for (let i = 0; i < charted.length; i++) {
    const milestone = charted[i];
    const y = chartY(baseY, i);
    const pctLabel =
      milestone.percentComplete != null ? `${Math.round(milestone.percentComplete)}%` : '–';

    slide.addText(`${milestone.title}  ·  ${pctLabel} complete`, {
      x: CHART_X,
      y: y - 0.05,
      w: CHART_W,
      h: 0.25,
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.statusLabelPt,
      color: MDT_COLORS.blue,
      bold: false,
    });

    if (!milestone.burnupData || milestone.burnupData.length === 0) {
      slide.addText(`${pctLabel} complete — no sprint data`, {
        x: CHART_X,
        y: y + 0.22,
        w: CHART_W,
        h: 0.5,
        fontFace: MDT_FONT,
        fontSize: 12,
        color: MDT_COLORS.bodyMuted,
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
        fontFace: MDT_FONT,
        fontSize: 12,
        color: MDT_COLORS.bodyMuted,
        align: 'center',
      });
    }
  }

  if (textOnly.length > 0) {
    const listY = chartY(baseY, MAX_CHARTS) + 0.1;
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
      fontFace: MDT_FONT,
      fontSize: MDT_TYPO.statusLabelPt,
      color: MDT_COLORS.black,
    });
  }

  addMdtFooter(slide, ctx, input);
}
