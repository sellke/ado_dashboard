import type {
  MetricTileViewModel,
  RagStatus,
  TrendSprintViewModel,
  WorkstreamCardViewModel,
} from '@/lib/dashboard/types';
import { renderChartToPng } from '@/lib/export/render/chart-image';
import { buildBugBurndownSlide } from '@/lib/export/slides/bug-burndown';
import type { ExportInput } from '@/lib/export/types';

/**
 * Unit tests for buildBugBurndownSlide.
 * pptxgenjs is mocked — tests verify the builder calls the pptxgenjs API
 * (addImage + metrics text) with the expected shapes.
 *
 * After Story 9 migration: chart is captured via renderChartToPng → addImage.
 */

jest.mock('@/lib/export/render/chart-image', () => ({
  renderChartToPng: jest.fn(() => Promise.resolve('data:image/png;base64,MOCK')),
}));
jest.mock('@/components/Dashboard/BugBurndownChart', () => ({
  BugBurndownChart: () => null,
}));

const testSlideCtx = { slideIndex: 2, totalSlides: 21 };

function makeMinimalExportInput(): ExportInput {
  return {
    sprintName: 'Sprint 24',
    computedAt: null,
    programMetrics: null,
    programRollup: null,
    programTrendSprints: [],
    sprint5Prediction: null,
    workstreams: [],
    rawWorkstreams: [],
    milestones: [],
  };
}

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
  overrides: Partial<WorkstreamCardViewModel> = {}
): WorkstreamCardViewModel {
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
      makeTrendSprint({
        sprintId: 's1',
        sprintName: 'Sprint 22',
        isCurrent: false,
        rawActiveBugs: 2,
        rawBugsClosed: 1,
      }),
      makeTrendSprint({
        sprintId: 's2',
        sprintName: 'Sprint 23',
        isCurrent: true,
        rawActiveBugs: 3,
        rawBugsClosed: 0,
        velocity: '15',
        rawVelocity: 15,
        rawVelocityRate: 0.4,
        velocityRate: '0.4',
        activeBugs: '3',
        bugsClosed: '0',
        completedPoints: 15,
        carryOverPoints: null,
        rawOverheadPercent: null,
        rawCarryOverRate: null,
      }),
    ],
    prediction: null,
    overheadComposition: [],
    overheadItemsBySprint: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRenderChartToPng.mockClear();
  mockRenderChartToPng.mockImplementation(() => Promise.resolve('data:image/png;base64,MOCK'));
});

describe('buildBugBurndownSlide', () => {
  it('captures the bug burndown chart as an image', async () => {
    const prs = makeMockPrs();
    await buildBugBurndownSlide(
      prs as never,
      makeMinimalExportInput(),
      testSlideCtx,
      makeWorkstreamCard()
    );
    expect(mockRenderChartToPng).toHaveBeenCalledTimes(1);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
    expect(prs._slide.addChart).not.toHaveBeenCalled();
  });

  it('passes the full chart area as the addImage coordinates', async () => {
    const prs = makeMockPrs();
    await buildBugBurndownSlide(
      prs as never,
      makeMinimalExportInput(),
      testSlideCtx,
      makeWorkstreamCard()
    );
    const [opts] = prs._slide.addImage.mock.calls[0] as [
      { data: string; x: number; y: number; w: number; h: number },
    ];
    expect(opts).toMatchObject({ x: 0.3, y: 1.55, w: 8.5, h: 5.5 });
    expect(opts.data).toMatch(/^data:image\/png/);
  });

  it('does not throw and shows placeholder when trendSprints is empty', async () => {
    const prs = makeMockPrs();
    await expect(
      buildBugBurndownSlide(
        prs as never,
        makeMinimalExportInput(),
        testSlideCtx,
        makeWorkstreamCard({ trendSprints: [] })
      )
    ).resolves.not.toThrow();
    expect(mockRenderChartToPng).not.toHaveBeenCalled();
    expect(prs._slide.addImage).not.toHaveBeenCalled();
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('No bug data available');
  });

  it('falls back to "Chart unavailable" text when capture rejects', async () => {
    mockRenderChartToPng.mockImplementationOnce(() => Promise.reject(new Error('boom')));
    const prs = makeMockPrs();
    await buildBugBurndownSlide(
      prs as never,
      makeMinimalExportInput(),
      testSlideCtx,
      makeWorkstreamCard()
    );
    const textCalls: string[] = prs._slide.addText.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(textCalls).toContain('Chart unavailable');
    expect(prs._slide.addImage).not.toHaveBeenCalled();
  });

  it('renders the chart even when all bug counts are zero', async () => {
    const prs = makeMockPrs();
    await buildBugBurndownSlide(
      prs as never,
      makeMinimalExportInput(),
      testSlideCtx,
      makeWorkstreamCard({
        trendSprints: [
          makeTrendSprint({
            sprintId: 's1',
            sprintName: 'Sprint 22',
            rawActiveBugs: 0,
            rawBugsClosed: 0,
          }),
          makeTrendSprint({
            sprintId: 's2',
            sprintName: 'Sprint 23',
            isCurrent: true,
            rawActiveBugs: 0,
            rawBugsClosed: 0,
          }),
        ],
      })
    );
    expect(mockRenderChartToPng).toHaveBeenCalledTimes(1);
    expect(prs._slide.addImage).toHaveBeenCalledTimes(1);
  });

  it("metrics panel shows '–' for current-sprint lines when no sprint has isCurrent=true", async () => {
    const prs = makeMockPrs();
    await buildBugBurndownSlide(
      prs as never,
      makeMinimalExportInput(),
      testSlideCtx,
      makeWorkstreamCard({
        trendSprints: [
          makeTrendSprint({
            sprintId: 's1',
            sprintName: 'Sprint 22',
            isCurrent: false,
            rawActiveBugs: 2,
            rawBugsClosed: 1,
          }),
          makeTrendSprint({
            sprintId: 's2',
            sprintName: 'Sprint 23',
            isCurrent: false,
            rawActiveBugs: 3,
            rawBugsClosed: 0,
          }),
        ],
      })
    );
    const dashCalls = prs._slide.addText.mock.calls.filter((c: unknown[]) => c[0] === '–');
    expect(dashCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('metrics panel shows current-sprint values when a current sprint exists', async () => {
    const prs = makeMockPrs();
    await buildBugBurndownSlide(
      prs as never,
      makeMinimalExportInput(),
      testSlideCtx,
      makeWorkstreamCard({
        trendSprints: [
          makeTrendSprint({
            sprintId: 's1',
            sprintName: 'Sprint 22',
            isCurrent: false,
            rawActiveBugs: 1,
            rawBugsClosed: 2,
          }),
          makeTrendSprint({
            sprintId: 's2',
            sprintName: 'Sprint 23',
            isCurrent: true,
            rawActiveBugs: 5,
            rawBugsClosed: 3,
          }),
        ],
      })
    );
    const firstArgs = prs._slide.addText.mock.calls.map((c: unknown[]) => c[0]);
    expect(firstArgs).toContain('5');
    expect(firstArgs).toContain('3');
  });
});
