import { buildProgramSummaryTiles } from '@/lib/export/slides/program-summary';
import type { ExportInput } from '@/lib/export/types';
import type { MetricTileViewModel } from '@/lib/dashboard/types';

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

function makeInput(overrides: Partial<ExportInput> = {}): ExportInput {
  return {
    sprintName: 'Sprint 24',
    computedAt: null,
    programMetrics: [makeMetric('A'), makeMetric('B'), makeMetric('C'), makeMetric('D')],
    programRollup: {
      currentMonth: 'March 2026',
      currentMonthCompletionPercent: 50,
      currentMonthTotalSP: 10,
      currentMonthCompletedSP: 5,
      quarter: 'Q4',
      quarterlyMilestones: { total: 2, complete: 1, inProgress: 1, notStarted: 0 },
    },
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreams: [],
    rawWorkstreams: [],
    milestones: [],
    ...overrides,
  };
}

describe('buildProgramSummaryTiles', () => {
  it('includes milestone rollup tiles when ADP metrics are included', () => {
    const tiles = buildProgramSummaryTiles(makeInput());
    expect(tiles.map((tile) => tile.label)).toEqual([
      'A',
      'B',
      'C',
      'Monthly Milestone',
      'Quarterly Progress',
    ]);
  });

  it('omits milestone rollup tiles when ADP metrics are excluded', () => {
    const tiles = buildProgramSummaryTiles(makeInput({ includeAdpMetrics: false }));
    expect(tiles.map((tile) => tile.label)).toEqual(['A', 'B', 'C']);
  });
});
