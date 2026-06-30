import type PptxGenJS from 'pptxgenjs';
import { BugBurndownChart } from '@/components/Dashboard/BugBurndownChart';
import { VelocityTrendChart } from '@/components/Dashboard/VelocityTrendChart';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { isAdpMetricsIncluded } from '@/lib/metrics/config-rules';
import { MDT_COLORS, MDT_FONT, MDT_TYPO, mdtContentTop } from '../mdt-theme';
import { ragColor } from '../rag-colors';
import { addChartUnavailablePlaceholder, addEmptyDataPanel } from '../placeholders';
import { renderChartToPng } from '../render/chart-image';
import { addMdtFooter, addMdtTitleBlock, type MdtSlideContext } from '../slide-frame';
import type { ExportInput } from '../types';

const SLIDE_W = 13.33;
const TILE_H = 1.7;
const TILE_W = 2.35;
const TILE_GAP = 0.15;
const TILE_START_X = (SLIDE_W - 5 * TILE_W - 4 * TILE_GAP) / 2;

const CHART_W = 6.2;
const VELOCITY_CHART_X = 0.3;
const BUG_CHART_X = 6.8;

interface TileData {
  label: string;
  value: string;
  avg: string | null;
  color: string;
}

function buildTiles(input: ExportInput): TileData[] {
  const tiles: TileData[] = [];

  if (!input.programMetrics) {
    return tiles;
  }

  for (const m of input.programMetrics) {
    tiles.push({
      label: m.label,
      value: m.value,
      avg: m.avgLabel,
      color: ragColor(m.rag),
    });
    if (tiles.length === 3) {
      break;
    }
  }

  if (!isAdpMetricsIncluded(input)) {
    return tiles;
  }

  const rollup = input.programRollup;
  const monthlyPct =
    rollup?.currentMonthCompletionPercent != null
      ? `${Math.round(rollup.currentMonthCompletionPercent)}%`
      : '–';
  const quarterlyVal =
    rollup?.quarterlyMilestones != null
      ? `${rollup.quarterlyMilestones.complete} / ${rollup.quarterlyMilestones.total}`
      : '–';

  tiles.push({
    label: 'Monthly Milestone',
    value: monthlyPct,
    avg: null,
    color: MDT_COLORS.navy,
  });
  tiles.push({
    label: 'Quarterly Progress',
    value: quarterlyVal,
    avg: null,
    color: MDT_COLORS.navy,
  });

  return tiles;
}

/** Exported for unit tests — builds program summary metric tiles including optional ADP rollup tiles. */
export function buildProgramSummaryTiles(input: ExportInput): TileData[] {
  return buildTiles(input);
}

/**
 * Adapts the slimmer ExportInput.sprint5Prediction shape to the prediction contract
 * VelocityTrendChart expects. velocityRate/rawVelocityRate are not used by the chart's
 * render path (only rawVelocity drives the forecast dot), so stub values satisfy the
 * compiler without changing the visual output.
 */
function adaptPrediction(
  prediction: ExportInput['sprint5Prediction']
): WorkstreamCardViewModel['prediction'] {
  if (!prediction) {
    return null;
  }
  return {
    velocity: prediction.rawVelocity != null ? `${prediction.rawVelocity}` : 'N/A',
    rawVelocity: prediction.rawVelocity,
    velocityRate: 'N/A',
    rawVelocityRate: null,
    sprintLabel: prediction.sprintLabel,
    isPredicted: prediction.isPredicted,
  };
}

export async function buildProgramSummarySlide(
  prs: InstanceType<typeof PptxGenJS>,
  input: ExportInput,
  ctx: MdtSlideContext
): Promise<void> {
  const slide = prs.addSlide();
  const sub = input.sprintName?.trim() ?? '';
  addMdtTitleBlock(slide, { title: 'Program Health Summary', subtitle: sub || null });

  const contentTop = mdtContentTop(!!sub);
  const TILE_Y = contentTop + 0.05;
  const CHART_Y = TILE_Y + TILE_H + 0.2;

  if (!input.programMetrics) {
    addEmptyDataPanel(slide, 'Program metrics are not available for this export.', {
      y: contentTop + 1.2,
    });
    addMdtFooter(slide, ctx, input);
    return;
  }

  const tiles = buildTiles(input);

  tiles.forEach((tile, i) => {
    const x = TILE_START_X + i * (TILE_W + TILE_GAP);

    slide.addShape('rect' as Parameters<typeof slide.addShape>[0], {
      x,
      y: TILE_Y,
      w: TILE_W,
      h: TILE_H,
      fill: { color: tile.color },
      line: { color: tile.color },
    });

    slide.addText(tile.label, {
      x,
      y: TILE_Y + 0.12,
      w: TILE_W,
      h: 0.4,
      fontFace: MDT_FONT,
      fontSize: 10,
      color: MDT_COLORS.white,
      align: 'center',
      bold: false,
    });

    slide.addText(tile.value, {
      x,
      y: TILE_Y + 0.55,
      w: TILE_W,
      h: 0.95,
      fontFace: MDT_FONT,
      fontSize: 24,
      color: MDT_COLORS.white,
      align: 'center',
      bold: true,
    });

    if (tile.avg) {
      slide.addText(tile.avg, {
        x,
        y: TILE_Y + 1.6,
        w: TILE_W,
        h: 0.4,
        fontFace: MDT_FONT,
        fontSize: 10,
        color: MDT_COLORS.white,
        align: 'center',
      });
    }
  });

  const trendSprints = input.programTrendSprints;

  if (trendSprints.length === 0) {
    addEmptyDataPanel(slide, 'Program trend charts are not available for this sprint window.', {
      y: CHART_Y + 0.5,
      w: 12.7,
    });
  } else {
    try {
      const velocityDataUrl = await renderChartToPng(
        <VelocityTrendChart
          trendSprints={trendSprints}
          prediction={adaptPrediction(input.sprint5Prediction)}
          animateSeries={false}
          width={620}
          height={370}
        />,
        { width: 620, height: 370 }
      );
      slide.addImage({
        data: velocityDataUrl,
        x: VELOCITY_CHART_X,
        y: CHART_Y,
        w: CHART_W,
        h: 3.7,
      });
    } catch (err) {
      console.error('[pptx-export] program velocity chart capture failed:', err);
      addChartUnavailablePlaceholder(slide, {
        x: VELOCITY_CHART_X,
        y: CHART_Y,
        w: CHART_W,
        h: 3.7,
        detail: 'Program velocity trend unavailable.',
      });
    }

    try {
      const bugDataUrl = await renderChartToPng(
        <BugBurndownChart
          trendSprints={trendSprints}
          width={620}
          height={370}
          animateSeries={false}
        />,
        { width: 620, height: 370 }
      );
      slide.addImage({
        data: bugDataUrl,
        x: BUG_CHART_X,
        y: CHART_Y,
        w: CHART_W,
        h: 3.7,
      });
    } catch (err) {
      console.error('[pptx-export] program bug burndown chart capture failed:', err);
      addChartUnavailablePlaceholder(slide, {
        x: BUG_CHART_X,
        y: CHART_Y,
        w: CHART_W,
        h: 3.7,
        detail: 'Program bug burndown unavailable.',
      });
    }
  }

  addMdtFooter(slide, ctx, input);
}
