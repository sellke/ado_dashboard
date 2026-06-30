import {
  deriveDataCaveats,
  enrichExportInput,
  mapCycleTimeAppendix,
  mapVisualizationSummary,
  mapWorkstreamSnapshots,
} from '@/lib/export/adapter';
import type { ExportInput } from '@/lib/export/types';
import type {
  CycleTimeTypeViewModel,
  DashboardViewModel,
  MetricTileViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';

function makeMetric(overrides: Partial<MetricTileViewModel> = {}): MetricTileViewModel {
  return {
    label: 'Velocity',
    value: '38 SP',
    rawValue: 38,
    unit: ' SP',
    rag: 'Green',
    avgLabel: '36 SP',
    ...overrides,
  };
}

function makeViewModel(overrides: Partial<DashboardViewModel> = {}): DashboardViewModel {
  return {
    state: 'success',
    sprintLabel: 'Sprint 24',
    rollingWindowLabel: 'Last 3 sprints',
    computedAtLabel: 'Jun 17, 2026',
    programMetrics: [
      makeMetric({ label: 'Velocity', rag: 'Green' }),
      makeMetric({ label: 'Overhead %', value: '22%', rag: 'Amber' }),
    ],
    programCycleTime: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreamCards: [],
    ...overrides,
  };
}

function makeBaseInput(
  workstreams: WorkstreamCardViewModel[] = [],
  extras: Partial<ExportInput> = {}
): ExportInput {
  return {
    sprintName: 'Sprint 24',
    computedAt: '2026-06-17T12:00:00Z',
    programMetrics: null,
    programRollup: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreams,
    rawWorkstreams: [],
    milestones: [],
    ...extras,
  };
}

describe('export adapter', () => {
  it('maps visualization summary with RAG counts and caveats', () => {
    const summary = mapVisualizationSummary(makeViewModel(), 'Sprint 24', '2026-06-17T12:00:00Z');
    expect(summary.healthLabel).toBe('Needs Attention');
    expect(summary.ragCounts).toEqual({ green: 1, amber: 1, red: 0, unset: 0 });
    expect(summary.sprintWindowLabel).toBe('Sprint 24');
    expect(summary.computedDateLabel).toBe('Jun 17, 2026');
    expect(summary.caveats).toContain('Rolling window: Last 3 sprints');
  });

  it('handles null program metrics without inferring zeros', () => {
    const summary = mapVisualizationSummary(
      makeViewModel({ programMetrics: null }),
      'Sprint 24',
      null
    );
    expect(summary.healthLabel).toBe('Status Unavailable');
    expect(summary.caveats).toContain('Program metrics are not yet available.');
  });

  it('maps workstream snapshots with N/A-friendly key metrics', () => {
    const ws: WorkstreamCardViewModel = {
      workstreamId: 'ws-1',
      workstreamName: 'Alpha',
      metrics: [makeMetric({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null })],
      detail: { plannedPoints: '0', completedPoints: '0', carryOverPoints: '0' },
      trendSprints: [],
      prediction: null,
      overheadComposition: [],
      overheadItemsBySprint: [],
    };
    const snapshots = mapWorkstreamSnapshots([ws]);
    expect(snapshots[0].workstreamName).toBe('Alpha');
    expect(snapshots[0].keyMetrics[0].value).toBe('N/A');
    expect(snapshots[0].statusCue).toBeNull();
  });

  it('maps cycle-time appendix with unavailable counts', () => {
    const cycleRow: CycleTimeTypeViewModel = {
      type: 'UserStory',
      label: 'User Story',
      totalBusinessDays: 10,
      averageBusinessDays: 5,
      completedItemCount: 2,
      unavailableItemCount: 3,
      totalLabel: '10 days',
      averageLabel: '5 days',
      unavailableLabel: '3 unavailable',
    };
    const sections = mapCycleTimeAppendix([cycleRow], []);
    expect(sections[0].typeRows[0].unavailableItemCount).toBe(3);
    expect(sections[0].caveat).toContain('3 item(s)');
  });

  it('enriches export input while preserving base fields', () => {
    const ws: WorkstreamCardViewModel = {
      workstreamId: 'ws-1',
      workstreamName: 'Alpha',
      metrics: [],
      detail: { plannedPoints: '0', completedPoints: '0', carryOverPoints: '0' },
      trendSprints: [],
      prediction: null,
      overheadComposition: [],
      overheadItemsBySprint: [],
    };
    const enriched = enrichExportInput(makeBaseInput([ws]), makeViewModel(), null);
    expect(enriched.sprintName).toBe('Sprint 24');
    expect(enriched.visualizationSummary?.healthLabel).toBe('Needs Attention');
    expect(enriched.workstreamSnapshots).toHaveLength(1);
    expect(enriched.dataCaveats?.some((c) => c.message.includes('Milestone rollup'))).toBe(true);
  });

  it('strips milestone export fields when ADP metrics are excluded', () => {
    const enriched = enrichExportInput(
      makeBaseInput([], {
        includeAdpMetrics: false,
        milestones: [{ id: 'ms-1' } as ExportInput['milestones'][number]],
        programRollup: {
          currentMonth: 'March 2026',
          currentMonthCompletionPercent: 50,
          currentMonthTotalSP: 10,
          currentMonthCompletedSP: 5,
          quarter: 'Q4',
          quarterlyMilestones: { total: 1, complete: 0, inProgress: 1, notStarted: 0 },
        },
      }),
      makeViewModel(),
      {
        currentMonth: 'March 2026',
        currentMonthCompletionPercent: 50,
        currentMonthTotalSP: 10,
        currentMonthCompletedSP: 5,
        quarter: 'Q4',
        quarterlyMilestones: { total: 1, complete: 0, inProgress: 1, notStarted: 0 },
      }
    );

    expect(enriched.milestones).toEqual([]);
    expect(enriched.programRollup).toBeNull();
    expect(enriched.milestoneContext).toBeNull();
    expect(enriched.dataCaveats?.some((c) => c.sectionId === 'milestone-context-appendix')).toBe(
      false
    );
  });

  it('derives program metric caveat when metrics are missing', () => {
    const caveats = deriveDataCaveats(makeViewModel({ programMetrics: null }), null);
    expect(caveats.some((c) => c.severity === 'warning' && c.scopeLabel === 'Program')).toBe(
      true
    );
  });
});
