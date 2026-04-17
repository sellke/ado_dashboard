import type PptxGenJS from 'pptxgenjs';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { VelocityTrendChart } from '@/components/Dashboard/VelocityTrendChart';
import { BugBurndownChart } from '@/components/Dashboard/BugBurndownChart';
import { ragColor } from '../rag-colors';
import { renderChartToPng } from '../render/chart-image';
import type { ExportInput } from '../types';

const SLIDE_W = 13.33;
const TILE_Y = 1.1;
const TILE_H = 1.7;
const TILE_W = 2.35;
const TILE_GAP = 0.15;
const TILE_START_X = (SLIDE_W - 5 * TILE_W - 4 * TILE_GAP) / 2;

const CHART_Y = 3.0;
const CHART_H = 3.7;
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

  const rollup = input.programRollup;
  const monthlyPct =
    rollup?.currentMonthCompletionPercent != null
      ? `${Math.round(rollup.currentMonthCompletionPercent)}%`
      : '–';
  const quarterlyVal =
    rollup?.quarterlyMilestones != null
      ? `${rollup.quarterlyMilestones.complete} / ${rollup.quarterlyMilestones.total}`
      : '–';

  tiles.push({ label: 'Monthly Milestone', value: monthlyPct, avg: null, color: '868e96' });
  tiles.push({ label: 'Quarterly Progress', value: quarterlyVal, avg: null, color: '868e96' });

  return tiles;
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
  input: ExportInput
): Promise<void> {
  const slide = prs.addSlide();

  slide.addText(`Program Health Summary — ${input.sprintName}`, {
    x: 0.3,
    y: 0.15,
    w: 12.7,
    h: 0.6,
    fontSize: 22,
    bold: true,
    color: '333333',
  });

  if (!input.programMetrics) {
    slide.addText('No data available', {
      x: 1,
      y: 3,
      w: 11,
      h: 1,
      fontSize: 18,
      color: '868e96',
      align: 'center',
    });
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
      fontSize: 10,
      color: 'FFFFFF',
      align: 'center',
      bold: false,
    });

    slide.addText(tile.value, {
      x,
      y: TILE_Y + 0.55,
      w: TILE_W,
      h: 0.95,
      fontSize: 24,
      color: 'FFFFFF',
      align: 'center',
      bold: true,
    });

    if (tile.avg) {
      slide.addText(tile.avg, {
        x,
        y: TILE_Y + 1.6,
        w: TILE_W,
        h: 0.4,
        fontSize: 10,
        color: 'FFFFFF',
        align: 'center',
      });
    }
  });

  const trendSprints = input.programTrendSprints;

  if (trendSprints.length === 0) {
    slide.addText('No program trend data available', {
      x: 0.3,
      y: 3.5,
      w: 12.7,
      h: 1.0,
      fontSize: 14,
      color: '868e96',
      align: 'center',
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
        h: CHART_H,
      });
    } catch (err) {
      console.error('[pptx-export] program velocity chart capture failed:', err);
      slide.addText('Chart unavailable', {
        x: VELOCITY_CHART_X,
        y: CHART_Y,
        w: CHART_W,
        h: CHART_H,
        fontSize: 14,
        color: '868e96',
        align: 'center',
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
        h: CHART_H,
      });
    } catch (err) {
      console.error('[pptx-export] program bug burndown chart capture failed:', err);
      slide.addText('Chart unavailable', {
        x: BUG_CHART_X,
        y: CHART_Y,
        w: CHART_W,
        h: CHART_H,
        fontSize: 14,
        color: '868e96',
        align: 'center',
      });
    }
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const computedLabel = input.computedAt
    ? `Last computed: ${new Date(input.computedAt).toLocaleString()}`
    : '';

  slide.addText(`Generated ${dateStr}${computedLabel ? ` | ${computedLabel}` : ''}`, {
    x: 0.3,
    y: 6.9,
    w: 12.7,
    h: 0.35,
    fontSize: 9,
    color: '999999',
    align: 'center',
  });
}
