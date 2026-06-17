import { buildSlidePlan } from '@/lib/export/slide-plan';
import type { ExportInput } from '@/lib/export/types';
import type { WorkstreamCardViewModel } from '@/lib/dashboard/types';

function makeWorkstream(id: string): WorkstreamCardViewModel {
  return {
    workstreamId: id,
    workstreamName: `WS ${id}`,
    metrics: [],
    detail: { plannedPoints: '0', completedPoints: '0', carryOverPoints: '0' },
    trendSprints: [],
    prediction: null,
    overheadComposition: [],
    overheadItemsBySprint: [],
  };
}

function makeInput(workstreamCount: number, extras: Partial<ExportInput> = {}): ExportInput {
  return {
    sprintName: 'Sprint 24',
    computedAt: null,
    programMetrics: null,
    programRollup: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreams: Array.from({ length: workstreamCount }, (_, i) => makeWorkstream(`ws-${i}`)),
    rawWorkstreams: [],
    milestones: [],
    ...extras,
  };
}

describe('buildSlidePlan', () => {
  it('produces one program-summary slide when workstreams is empty', () => {
    const plan = buildSlidePlan(makeInput(0));
    expect(plan.totalSlides).toBe(1);
    expect(plan.descriptors).toHaveLength(1);
    expect(plan.descriptors[0].kind).toBe('program-summary');
    expect(plan.descriptors[0].slideIndex).toBe(1);
  });

  it('produces 1 + (workstreams × 4) slides for one workstream', () => {
    const plan = buildSlidePlan(makeInput(1));
    expect(plan.totalSlides).toBe(5);
    expect(plan.descriptors.map((d) => d.kind)).toEqual([
      'program-summary',
      'workstream-velocity',
      'workstream-bug-burndown',
      'workstream-overhead',
      'workstream-milestone',
    ]);
  });

  it('produces 21 slides for five workstreams', () => {
    const plan = buildSlidePlan(makeInput(5));
    expect(plan.totalSlides).toBe(21);
    expect(plan.descriptors[0].slideIndex).toBe(1);
    expect(plan.descriptors[plan.descriptors.length - 1].slideIndex).toBe(21);
  });

  it('assigns sequential slide indices and matching totalSlides', () => {
    const plan = buildSlidePlan(makeInput(3));
    plan.descriptors.forEach((d, i) => {
      expect(d.slideIndex).toBe(i + 1);
    });
    expect(plan.totalSlides).toBe(plan.descriptors.length);
  });

  it('includes snapshot slides when includeSnapshots is true', () => {
    const plan = buildSlidePlan(makeInput(5), { includeSnapshots: true });
    expect(plan.descriptors[0].kind).toBe('program-snapshot');
    expect(plan.descriptors.some((d) => d.kind === 'workstream-snapshot')).toBe(true);
    expect(plan.totalSlides).toBeGreaterThan(21);
  });

  it('includes appendix slides only when includeAppendices and data exist', () => {
    const without = buildSlidePlan(makeInput(1), { includeAppendices: true });
    expect(without.descriptors.some((d) => d.kind.includes('appendix'))).toBe(false);

    const withData = buildSlidePlan(
      makeInput(1, {
        rollingMetricAppendix: [
          {
            scope: 'program',
            scopeLabel: 'Program',
            metricLabel: 'Velocity Rate',
            summaryValue: '0.8',
            rollingWindowLabel: '3 sprints',
            rows: [{ sprintName: 'Sprint 1', value: '0.8', rollingAverageValue: '0.75' }],
            emptyMessage: null,
          },
        ],
        dataCaveats: [
          { severity: 'info', scopeLabel: 'Program', message: 'Partial data' },
        ],
      }),
      { includeAppendices: true }
    );

    expect(withData.descriptors.some((d) => d.kind === 'rolling-metric-appendix')).toBe(true);
    expect(withData.descriptors.some((d) => d.kind === 'partial-data-appendix')).toBe(true);
  });
});
