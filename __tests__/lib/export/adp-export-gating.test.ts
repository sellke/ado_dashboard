import { enrichExportInput } from '@/lib/export/adapter';
import { buildSlidePlan } from '@/lib/export/slide-plan';
import { buildProgramSummaryTiles } from '@/lib/export/slides/program-summary';
import type { ExportInput } from '@/lib/export/types';
import type { DashboardViewModel, MetricTileViewModel } from '@/lib/dashboard/types';

function makeMetric(label: string): MetricTileViewModel {
  return {
    label,
    value: '1',
    rawValue: 1,
    unit: '',
    rag: 'Green',
    avgLabel: null,
  };
}

describe('ADP export gating integration', () => {
  it('excludes milestone slides and tiles end-to-end when includeAdpMetrics is false', () => {
    const viewModel: DashboardViewModel = {
      state: 'success',
      sprintLabel: 'Sprint 24',
      rollingWindowLabel: null,
      computedAtLabel: null,
      programMetrics: [makeMetric('Velocity'), makeMetric('Overhead %'), makeMetric('Predictability')],
      programCycleTime: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [
        {
          workstreamId: 'ws-1',
          workstreamName: 'Alpha',
          metrics: [],
          detail: { plannedPoints: '0', completedPoints: '0', carryOverPoints: '0' },
          trendSprints: [],
          prediction: null,
          overheadComposition: [],
          overheadItemsBySprint: [],
        },
      ],
    };

    const rollup = {
      currentMonth: 'March 2026',
      currentMonthCompletionPercent: 50,
      currentMonthTotalSP: 10,
      currentMonthCompletedSP: 5,
      quarter: 'Q4',
      quarterlyMilestones: { total: 1, complete: 0, inProgress: 1, notStarted: 0 },
    };

    const base: ExportInput = {
      sprintName: 'Sprint 24',
      computedAt: null,
      programMetrics: viewModel.programMetrics,
      programRollup: rollup,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreams: viewModel.workstreamCards,
      rawWorkstreams: [],
      milestones: [{ id: 'ms-1' } as ExportInput['milestones'][number]],
      includeAdpMetrics: false,
    };

    const enriched = enrichExportInput(base, viewModel, rollup);
    const plan = buildSlidePlan(enriched, { includeAppendices: true });
    const tiles = buildProgramSummaryTiles(enriched);

    expect(enriched.milestones).toEqual([]);
    expect(enriched.programRollup).toBeNull();
    expect(plan.descriptors.some((d) => d.kind === 'workstream-milestone')).toBe(false);
    expect(plan.descriptors.some((d) => d.kind === 'milestone-context-appendix')).toBe(false);
    expect(tiles.some((tile) => tile.label === 'Monthly Milestone')).toBe(false);
    expect(tiles.some((tile) => tile.label === 'Quarterly Progress')).toBe(false);
  });
});
