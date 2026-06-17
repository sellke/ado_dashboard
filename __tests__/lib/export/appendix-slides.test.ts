import {
  buildCycleTimeAppendixSlide,
  buildMilestoneContextAppendixSlide,
  buildPartialDataAppendixSlide,
  buildRollingMetricAppendixSlide,
} from '@/lib/export/slides/appendix';
import type { ExportInput } from '@/lib/export/types';

function makeMockSlide() {
  return { addText: jest.fn(), addShape: jest.fn(), addChart: jest.fn(), addImage: jest.fn() };
}

function makeMockPrs() {
  const slide = makeMockSlide();
  return { addSlide: jest.fn(() => slide), _slide: slide };
}

const ctx = { slideIndex: 1, totalSlides: 2 };

describe('appendix slide builders', () => {
  it('rolling metric appendix renders rows with N/A for null rolling averages', async () => {
    const prs = makeMockPrs();
    await buildRollingMetricAppendixSlide(
      prs as never,
      { sprintName: 'S1' } as ExportInput,
      ctx,
      [
        {
          scope: 'program',
          scopeLabel: 'Program',
          metricLabel: 'Velocity Rate',
          summaryValue: '0.8',
          rollingWindowLabel: '3 sprints',
          rows: [{ sprintName: 'Sprint 1', value: '0.8', rollingAverageValue: null }],
          emptyMessage: null,
        },
      ]
    );
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('N/A');
    expect(text).toContain('Velocity Rate');
  });

  it('cycle-time appendix surfaces unavailable counts', async () => {
    const prs = makeMockPrs();
    await buildCycleTimeAppendixSlide(
      prs as never,
      { sprintName: 'S1' } as ExportInput,
      ctx,
      [
        {
          scopeLabel: 'Program',
          typeRows: [
            {
              typeLabel: 'User Story',
              averageLabel: '5 days',
              completedItemCount: 2,
              unavailableItemCount: 3,
              unavailableLabel: '3 unavailable',
            },
          ],
          caveat: '3 item(s) lack cycle-time data',
        },
      ]
    );
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('3');
    expect(text).toContain('lack cycle-time');
  });

  it('milestone context appendix shows empty state when context is null', async () => {
    const prs = makeMockPrs();
    await buildMilestoneContextAppendixSlide(
      prs as never,
      { sprintName: 'S1' } as ExportInput,
      ctx,
      null
    );
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('not available');
  });

  it('partial data appendix lists caveats', async () => {
    const prs = makeMockPrs();
    await buildPartialDataAppendixSlide(
      prs as never,
      { sprintName: 'S1' } as ExportInput,
      ctx,
      [{ severity: 'warning', scopeLabel: 'Program', message: 'Metrics missing' }]
    );
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('WARNING');
    expect(text).toContain('Metrics missing');
  });
});
