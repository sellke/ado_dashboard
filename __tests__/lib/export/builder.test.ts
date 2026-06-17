jest.mock('@/lib/export/render/chart-image', () => ({
  renderChartToPng: jest.fn(() => Promise.resolve('data:image/png;base64,MOCK')),
}));
jest.mock('@/components/Dashboard/VelocityTrendChart', () => ({
  VelocityTrendChart: () => null,
}));
jest.mock('@/components/Dashboard/BugBurndownChart', () => ({
  BugBurndownChart: () => null,
}));
jest.mock('@/components/Dashboard/OverheadCompositionChart', () => ({
  OverheadCompositionChart: () => null,
}));
jest.mock('@/components/Dashboard/BurnupChart', () => ({
  BurnupChart: () => null,
}));

import { buildPresentation } from '@/lib/export/builder';
import { MDT_LAYOUT } from '@/lib/export/mdt-theme';
import { renderChartToPng } from '@/lib/export/render/chart-image';
import type { ExportInput } from '@/lib/export/types';
import type {
  WorkstreamCardViewModel,
  MetricTileViewModel,
  TrendSprintViewModel,
} from '@/lib/dashboard/types';
import type { ApiMilestoneWithProgress } from '@/lib/milestones/types';

const mockRenderChartToPng = renderChartToPng as jest.MockedFunction<typeof renderChartToPng>;

// ---------------------------------------------------------------------------
// Mock pptxgenjs
// ---------------------------------------------------------------------------

function makeMockSlide() {
  return {
    addText: jest.fn(),
    addShape: jest.fn(),
    addChart: jest.fn(),
    addImage: jest.fn(),
  };
}

class MockPptxGenJS {
  layout = '';
  _slides: ReturnType<typeof makeMockSlide>[] = [];

  addSlide() {
    const slide = makeMockSlide();
    this._slides.push(slide);
    return slide;
  }

  get slideCount() {
    return this._slides.length;
  }
}

function makeMetricTile(label: string): MetricTileViewModel {
  return { label, value: '10', rawValue: 10, unit: ' SP', rag: 'Green', avgLabel: '8 SP' };
}

function makeTrendSprint(overrides: Partial<TrendSprintViewModel> = {}): TrendSprintViewModel {
  return {
    sprintId: 's1',
    sprintName: 'Sprint 22',
    isCurrent: false,
    velocity: '38',
    velocityRate: '0.8',
    activeBugs: '2',
    bugsClosed: '1',
    rawVelocity: 38,
    rawVelocityRate: 0.8,
    rawActiveBugs: 2,
    rawBugsClosed: 1,
    bugs: [],
    overheadBreakdown: [],
    velocityAvg: 36,
    overheadPercentAvg: 22,
    carryOverRateAvg: 10,
    plannedPoints: 40,
    completedPoints: 38,
    carryOverPoints: 2,
    grossHours: 200,
    rawOverheadPercent: 22,
    rawCarryOverRate: 10,
    ...overrides,
  };
}

function makeWorkstreamCard(
  id: string,
  name: string,
  withData: boolean
): WorkstreamCardViewModel {
  return {
    workstreamId: id,
    workstreamName: name,
    metrics: [
      makeMetricTile('Velocity'),
      makeMetricTile('Velocity Rate'),
      makeMetricTile('Overhead %'),
      makeMetricTile('Carry-Over %'),
    ],
    detail: { plannedPoints: '10', completedPoints: '10', carryOverPoints: '0' },
    trendSprints: withData
      ? [
          makeTrendSprint({ sprintId: `${id}-s1`, sprintName: 'Sprint 22', isCurrent: false }),
          makeTrendSprint({ sprintId: `${id}-s2`, sprintName: 'Sprint 23', isCurrent: true }),
        ]
      : [],
    prediction: null,
    overheadComposition: withData
      ? [
          {
            sprintName: 'Sprint 22',
            ceremonyHours: 8,
            bugHours: 3,
            spikeHours: 1,
            supportHours: 2,
            overheadPercent: '22%',
          },
        ]
      : [],
    overheadItemsBySprint: [],
  };
}

function makeMilestone(wsId: string): ApiMilestoneWithProgress {
  return {
    id: `${wsId}-ms-1`,
    title: `${wsId} Milestone`,
    workstreamId: wsId,
    targetMonth: '2026-04',
    status: 'In Progress',
    adoFeatureId: 1,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    workstream: { id: wsId, name: wsId },
    completedPoints: 10,
    totalPoints: 20,
    percentComplete: 50,
    quarter: 'Q4',
    burnupData: [
      { sprintName: 'Sprint 22', sprintId: 's1', cumulativeCompletedSP: 5, totalSP: 20 },
      { sprintName: 'Sprint 23', sprintId: 's2', cumulativeCompletedSP: 10, totalSP: 20 },
    ],
  };
}

function makeInput(wsCount: number, withData = false): ExportInput {
  const workstreams = Array.from({ length: wsCount }, (_, i) =>
    makeWorkstreamCard(`ws-${i}`, `Workstream ${i}`, withData)
  );
  return {
    sprintName: 'Sprint 24',
    computedAt: null,
    programMetrics: [makeMetricTile('Velocity'), makeMetricTile('Overhead %'), makeMetricTile('Carry-Over %')],
    programRollup: null,
    programTrendSprints: withData
      ? [
          makeTrendSprint({ sprintId: 'prog-s1', sprintName: 'Sprint 22', isCurrent: false }),
          makeTrendSprint({ sprintId: 'prog-s2', sprintName: 'Sprint 23', isCurrent: true }),
        ]
      : [],
    sprint5Prediction: null,
    workstreams,
    rawWorkstreams: [],
    milestones: withData ? workstreams.map((ws) => makeMilestone(ws.workstreamId)) : [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRenderChartToPng.mockClear();
  mockRenderChartToPng.mockImplementation(() =>
    Promise.resolve('data:image/png;base64,MOCK')
  );
});

describe('buildPresentation', () => {
  it('produces layered deck slides for 5 workstreams (snapshots + detail)', async () => {
    const prs = await buildPresentation(
      MockPptxGenJS as unknown as typeof import('pptxgenjs').default,
      makeInput(5)
    );
    // 1 program snapshot + 2 workstream snapshot pages + 1 program summary + 20 detail
    expect((prs as unknown as MockPptxGenJS).slideCount).toBe(24);
  });

  it('produces program snapshot + summary when workstreams is empty', async () => {
    const prs = await buildPresentation(
      MockPptxGenJS as unknown as typeof import('pptxgenjs').default,
      makeInput(0)
    );
    expect((prs as unknown as MockPptxGenJS).slideCount).toBe(2);
  });

  it('sets layout to LAYOUT_WIDE', async () => {
    const prs = await buildPresentation(
      MockPptxGenJS as unknown as typeof import('pptxgenjs').default,
      makeInput(1)
    );
    expect((prs as unknown as { layout: string }).layout).toBe('LAYOUT_WIDE');
  });

  it('footer page numbers follow slide plan totals for multiple workstreams', async () => {
    const prs = await buildPresentation(
      MockPptxGenJS as unknown as typeof import('pptxgenjs').default,
      makeInput(3)
    );
    const slides = (prs as unknown as MockPptxGenJS)._slides;
    const pageNumbers = slides.map((s) =>
      s.addText.mock.calls.find((c) => c[1]?.x === MDT_LAYOUT.footerPageX)?.[0]
    );
    expect(pageNumbers[0]).toBe('1');
    expect(pageNumbers[pageNumbers.length - 1]).toBe('15');
    expect(slides.length).toBe(15);
  });

  it('does not throw with null programMetrics and empty milestones', async () => {
    const input = makeInput(3);
    input.programMetrics = null;
    await expect(
      buildPresentation(MockPptxGenJS as unknown as typeof import('pptxgenjs').default, input)
    ).resolves.toBeDefined();
  });

  it('per-workstream slide order is Velocity → Bug Burndown → Overhead → Milestone', async () => {
    const prs = await buildPresentation(
      MockPptxGenJS as unknown as typeof import('pptxgenjs').default,
      makeInput(1)
    );
    const slides = (prs as unknown as MockPptxGenJS)._slides;
    // Index 0 program snapshot, 1 workstream snapshot, 2 program summary, then detail.
    const titles = slides.slice(3, 7).map((s) => s.addText.mock.calls[0][0]);
    expect(titles).toEqual([
      'Workstream 0 — Velocity',
      'Workstream 0 — Bug Burndown',
      'Workstream 0 — Overhead',
      'Workstream 0 — Milestones',
    ]);
  });

  it('continues through the full deck when a single chart capture rejects', async () => {
    // With 5 workstreams and populated data, we expect multiple renderChartToPng
    // calls: 2 for program summary + 5×(velocity + bug-burndown + overhead + milestone-burnup) = 22.
    // Reject the 3rd call (the first workstream's velocity capture) and verify the
    // rest of the deck still assembles correctly.
    let callCount = 0;
    mockRenderChartToPng.mockImplementation(() => {
      callCount++;
      if (callCount === 3) return Promise.reject(new Error('capture failed'));
      return Promise.resolve('data:image/png;base64,MOCK');
    });

    const input = makeInput(5, true);
    const prs = await buildPresentation(
      MockPptxGenJS as unknown as typeof import('pptxgenjs').default,
      input
    );

    expect((prs as unknown as MockPptxGenJS).slideCount).toBe(24);

    const slides = (prs as unknown as MockPptxGenJS)._slides;
    // Velocity slide for workstream 0 — after snapshot slides and program summary.
    const velocitySlide = slides[4];
    const textCalls = velocitySlide.addText.mock.calls.map((c) => String(c[0]));
    expect(textCalls).toContain('Chart unavailable');

    // Every other slide in the deck had its chart capture succeed — sum of addImage
    // calls across the remaining 20 slides should match the non-failing capture count.
    const otherSlides = slides.filter((_, i) => i !== 4);
    const totalImages = otherSlides.reduce(
      (sum, s) => sum + s.addImage.mock.calls.length,
      0
    );
    // Program summary (2) + 5 × 4 charts − 1 failed (in slide 1) = 21 successful captures.
    expect(totalImages).toBe(21);
  });
});
