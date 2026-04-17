/**
 * Unit tests for slide builder functions.
 * pptxgenjs is mocked — tests verify the builders don't throw and call the
 * pptxgenjs API with reasonable shapes.
 *
 * After Story 9 migration to Recharts-captured images:
 * - Each builder is async
 * - Charts are captured via renderChartToPng → slide.addImage (not addChart)
 * - renderChartToPng and dashboard chart components are mocked so JSDOM never
 *   instantiates Recharts.
 */

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

import { renderChartToPng } from '@/lib/export/render/chart-image';
import { buildProgramSummarySlide } from '@/lib/export/slides/program-summary';
import { buildVelocitySlide } from '@/lib/export/slides/velocity';
import { buildOverheadSlide } from '@/lib/export/slides/overhead';
import { buildMilestoneSlide } from '@/lib/export/slides/milestone';
import type { ExportInput } from '@/lib/export/types';
import type {
  WorkstreamCardViewModel,
  MetricTileViewModel,
  RagStatus,
  TrendSprintViewModel,
} from '@/lib/dashboard/types';
import type { ApiMilestoneWithProgress } from '@/lib/milestones/types';

const mockRenderChartToPng = renderChartToPng as jest.MockedFunction<typeof renderChartToPng>;

// ---------------------------------------------------------------------------
// Mock pptxgenjs slide
// ---------------------------------------------------------------------------

interface MockSlide {
  addText: jest.Mock;
  addShape: jest.Mock;
  addChart: jest.Mock;
  addImage: jest.Mock;
}

interface MockPrs {
  _slide: MockSlide;
  addSlide: jest.Mock;
  layout: string;
}

function makeMockSlide(): MockSlide {
  return {
    addText: jest.fn(),
    addShape: jest.fn(),
    addChart: jest.fn(),
    addImage: jest.fn(),
  };
}

function makeMockPrs(): MockPrs {
  const slide = makeMockSlide();
  return {
    _slide: slide,
    addSlide: jest.fn(() => slide),
    layout: 'LAYOUT_WIDE',
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMetricTile(label: string, rag: RagStatus = 'Green'): MetricTileViewModel {
  return {
    label,
    value: '42',
    rawValue: 42,
    unit: ' SP',
    rag,
    avgLabel: 'Avg: 38 SP',
    mode: 'actual',
  };
}

function makeTrendSprint(overrides: Partial<TrendSprintViewModel> = {}): TrendSprintViewModel {
  return {
    sprintId: 's1',
    sprintName: 'Sprint 23',
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

function makeMinimalExportInput(overrides: Partial<ExportInput> = {}): ExportInput {
  return {
    sprintName: 'Sprint 24',
    computedAt: '2026-04-16T10:00:00Z',
    programMetrics: [
      makeMetricTile('Velocity', 'Green'),
      makeMetricTile('Overhead %', 'Amber'),
      makeMetricTile('Carry-Over %', 'Red'),
    ],
    programRollup: {
      currentMonth: 'April 2026',
      currentMonthCompletionPercent: 75,
      currentMonthTotalSP: 40,
      currentMonthCompletedSP: 30,
      quarter: 'Q4',
      quarterlyMilestones: { total: 8, complete: 5, inProgress: 2, notStarted: 1 },
    },
    programTrendSprints: [
      makeTrendSprint({ sprintId: 's1', sprintName: 'Sprint 22', isCurrent: false, rawVelocity: 30, rawActiveBugs: 4, rawBugsClosed: 2 }),
      makeTrendSprint({ sprintId: 's2', sprintName: 'Sprint 23', isCurrent: true, rawVelocity: 20, rawActiveBugs: 3, rawBugsClosed: 1 }),
    ],
    sprint5Prediction: { rawVelocity: 35, sprintLabel: 'Sprint 24', isPredicted: true },
    workstreams: [],
    rawWorkstreams: [],
    milestones: [],
    ...overrides,
  };
}

function makeWorkstreamCard(overrides: Partial<WorkstreamCardViewModel> = {}): WorkstreamCardViewModel {
  return {
    workstreamId: 'ws-1',
    workstreamName: 'Streams',
    metrics: [
      makeMetricTile('Velocity', 'Green'),
      makeMetricTile('Velocity Rate', null),
      makeMetricTile('Overhead %', 'Amber'),
      makeMetricTile('Carry-Over %', 'Red'),
    ],
    detailSprintLabel: 'Sprint 23',
    detail: { plannedPoints: '20', completedPoints: '18', carryOverPoints: '2' },
    trendSprints: [
      {
        sprintId: 's1', sprintName: 'Sprint 22', isCurrent: false,
        velocity: '38', velocityRate: '0.8', activeBugs: '2', bugsClosed: '1',
        rawVelocity: 38, rawVelocityRate: 0.8, rawActiveBugs: 2, rawBugsClosed: 1,
        bugs: [], overheadBreakdown: [],
        velocityAvg: 36, overheadPercentAvg: 22, carryOverRateAvg: 10,
        plannedPoints: 40, completedPoints: 38, carryOverPoints: 2, grossHours: 200,
        rawOverheadPercent: 22, rawCarryOverRate: 10,
      },
      {
        sprintId: 's2', sprintName: 'Sprint 23', isCurrent: true,
        velocity: '15', velocityRate: '0.4', activeBugs: '3', bugsClosed: '0',
        rawVelocity: 15, rawVelocityRate: 0.4, rawActiveBugs: 3, rawBugsClosed: 0,
        bugs: [], overheadBreakdown: [],
        velocityAvg: 36, overheadPercentAvg: 22, carryOverRateAvg: 10,
        plannedPoints: 40, completedPoints: 15, carryOverPoints: null, grossHours: 200,
        rawOverheadPercent: null, rawCarryOverRate: null,
      },
    ],
    prediction: { velocity: '40', rawVelocity: 40, velocityRate: '0.8', rawVelocityRate: 0.8, sprintLabel: 'Sprint 24', isPredicted: true },
    overheadComposition: [
      { sprintName: 'Sprint 22', ceremonyHours: 82, bugHours: 10, spikeHours: 5, supportHours: 3, overheadPercent: '22%' },
    ],
    overheadItemsBySprint: [],
    ...overrides,
  };
}

function makeMilestone(overrides: Partial<ApiMilestoneWithProgress> = {}): ApiMilestoneWithProgress {
  return {
    id: 'ms-1',
    title: 'Feature Alpha',
    workstreamId: 'ws-1',
    targetMonth: '2026-04',
    status: 'In Progress',
    adoFeatureId: 123,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-04-01T00:00:00Z',
    workstream: { id: 'ws-1', name: 'Streams' },
    completedPoints: 15,
    totalPoints: 20,
    percentComplete: 75,
    quarter: 'Q4',
    burnupData: [
      { sprintName: 'Sprint 22', sprintId: 's1', cumulativeCompletedSP: 10, totalSP: 20 },
      { sprintName: 'Sprint 23', sprintId: 's2', cumulativeCompletedSP: 15, totalSP: 20 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  mockRenderChartToPng.mockClear();
  mockRenderChartToPng.mockImplementation(() =>
    Promise.resolve('data:image/png;base64,MOCK')
  );
});

// ---------------------------------------------------------------------------
// Program Summary Slide
// ---------------------------------------------------------------------------

describe('buildProgramSummarySlide', () => {
  it('adds a slide and renders metric tiles with full data', async () => {
    const prs = makeMockPrs();
    await buildProgramSummarySlide(prs as never, makeMinimalExportInput());
    expect(prs.addSlide).toHaveBeenCalledTimes(1);
    expect(prs._slide.addShape).toHaveBeenCalledTimes(5);
  });

  it('does not throw when programMetrics is null', async () => {
    const prs = makeMockPrs();
    await expect(
      buildProgramSummarySlide(prs as never, makeMinimalExportInput({ programMetrics: null }))
    ).resolves.not.toThrow();
  });

  it('does not throw when programRollup is null', async () => {
    const prs = makeMockPrs();
    await expect(
      buildProgramSummarySlide(prs as never, makeMinimalExportInput({ programRollup: null }))
    ).resolves.not.toThrow();
  });

  it('shows "–" for milestone tiles when rollup is null', async () => {
    const prs = makeMockPrs();
    await buildProgramSummarySlide(prs as never, makeMinimalExportInput({ programRollup: null }));
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls.filter((t) => t === '–').length).toBeGreaterThanOrEqual(2);
  });

  it('captures program velocity + bug burndown charts as images when programTrendSprints is populated', async () => {
    const prs = makeMockPrs();
    await buildProgramSummarySlide(prs as never, makeMinimalExportInput());

    expect(mockRenderChartToPng).toHaveBeenCalledTimes(2);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(2);
    expect(prs._slide.addChart).not.toHaveBeenCalled();

    const firstImage = prs._slide.addImage.mock.calls[0][0] as {
      data: string; x: number; y: number; w: number; h: number;
    };
    expect(firstImage).toMatchObject({
      data: expect.stringMatching(/^data:image\/png/) as unknown as string,
      x: 0.3,
      y: 3.0,
      w: 6.2,
      h: 3.7,
    });

    const secondImage = prs._slide.addImage.mock.calls[1][0] as {
      data: string; x: number; y: number; w: number; h: number;
    };
    expect(secondImage).toMatchObject({ x: 6.8, y: 3.0, w: 6.2, h: 3.7 });
  });

  it('does not render charts when programTrendSprints is empty', async () => {
    const prs = makeMockPrs();
    await buildProgramSummarySlide(
      prs as never,
      makeMinimalExportInput({ programTrendSprints: [] })
    );
    expect(mockRenderChartToPng).not.toHaveBeenCalled();
    expect(prs._slide.addImage).not.toHaveBeenCalled();
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('No program trend data available');
  });

  it('falls back to "Chart unavailable" text when velocity capture rejects', async () => {
    mockRenderChartToPng
      .mockImplementationOnce(() => Promise.reject(new Error('capture failed')))
      .mockImplementationOnce(() => Promise.resolve('data:image/png;base64,MOCK'));

    const prs = makeMockPrs();
    await buildProgramSummarySlide(prs as never, makeMinimalExportInput());

    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('Chart unavailable');
  });
});

// ---------------------------------------------------------------------------
// Velocity Slide
// ---------------------------------------------------------------------------

describe('buildVelocitySlide', () => {
  it('adds a slide and captures the velocity chart as an image', async () => {
    const prs = makeMockPrs();
    await buildVelocitySlide(prs as never, makeWorkstreamCard());
    expect(prs.addSlide).toHaveBeenCalledTimes(1);
    expect(mockRenderChartToPng).toHaveBeenCalledTimes(1);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
    expect(prs._slide.addChart).not.toHaveBeenCalled();
  });

  it('addImage is called with the expected slide coordinates', async () => {
    const prs = makeMockPrs();
    await buildVelocitySlide(prs as never, makeWorkstreamCard());
    const [imageOpts] = prs._slide.addImage.mock.calls[0] as [
      { data: string; x: number; y: number; w: number; h: number },
    ];
    expect(imageOpts).toMatchObject({ x: 0.3, y: 0.85, w: 8.5, h: 5.5 });
  });

  it('does not capture a chart when trendSprints is empty', async () => {
    const prs = makeMockPrs();
    await expect(
      buildVelocitySlide(prs as never, makeWorkstreamCard({ trendSprints: [] }))
    ).resolves.not.toThrow();
    expect(mockRenderChartToPng).not.toHaveBeenCalled();
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });

  it('falls back to "Chart unavailable" when capture rejects', async () => {
    mockRenderChartToPng.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const prs = makeMockPrs();
    await buildVelocitySlide(prs as never, makeWorkstreamCard());
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('Chart unavailable');
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Overhead Slide
// ---------------------------------------------------------------------------

describe('buildOverheadSlide', () => {
  it('captures an overhead composition chart as an image', async () => {
    const prs = makeMockPrs();
    await buildOverheadSlide(prs as never, makeWorkstreamCard());
    expect(mockRenderChartToPng).toHaveBeenCalledTimes(1);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
    expect(prs._slide.addChart).not.toHaveBeenCalled();
  });

  it('does not throw with empty overheadComposition', async () => {
    const prs = makeMockPrs();
    await expect(
      buildOverheadSlide(prs as never, makeWorkstreamCard({ overheadComposition: [] }))
    ).resolves.not.toThrow();
    expect(mockRenderChartToPng).not.toHaveBeenCalled();
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });

  it('falls back to "Chart unavailable" when capture rejects', async () => {
    mockRenderChartToPng.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const prs = makeMockPrs();
    await buildOverheadSlide(prs as never, makeWorkstreamCard());
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('Chart unavailable');
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Milestone Slide
// ---------------------------------------------------------------------------

describe('buildMilestoneSlide', () => {
  it('captures a burnup chart as an image for a milestone with burnup data', async () => {
    const prs = makeMockPrs();
    await buildMilestoneSlide(prs as never, makeWorkstreamCard(), [makeMilestone()]);
    expect(mockRenderChartToPng).toHaveBeenCalledTimes(1);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
    expect(prs._slide.addChart).not.toHaveBeenCalled();
  });

  it('does not throw when no milestones for workstream', async () => {
    const prs = makeMockPrs();
    await expect(buildMilestoneSlide(prs as never, makeWorkstreamCard(), [])).resolves.not.toThrow();
    expect(mockRenderChartToPng).not.toHaveBeenCalled();
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });

  it('does not throw when burnupData is empty', async () => {
    const prs = makeMockPrs();
    await expect(
      buildMilestoneSlide(prs as never, makeWorkstreamCard(), [makeMilestone({ burnupData: [] })])
    ).resolves.not.toThrow();
    expect(mockRenderChartToPng).not.toHaveBeenCalled();
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });

  it('only captures charts for up to 3 milestones; remaining are text-only', async () => {
    const prs = makeMockPrs();
    const milestones = Array.from({ length: 5 }, (_, i) =>
      makeMilestone({ id: `ms-${i}`, title: `Milestone ${i}` })
    );
    await buildMilestoneSlide(prs as never, makeWorkstreamCard(), milestones);
    expect(mockRenderChartToPng).toHaveBeenCalledTimes(3);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(3);
  });

  it('falls back to "Chart unavailable" text when a capture rejects but continues through remaining milestones', async () => {
    mockRenderChartToPng
      .mockImplementationOnce(() => Promise.reject(new Error('boom')))
      .mockImplementation(() => Promise.resolve('data:image/png;base64,MOCK'));

    const prs = makeMockPrs();
    const milestones = [
      makeMilestone({ id: 'ms-0', title: 'Broken' }),
      makeMilestone({ id: 'ms-1', title: 'OK' }),
    ];
    await buildMilestoneSlide(prs as never, makeWorkstreamCard(), milestones);

    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('Chart unavailable');
  });
});
