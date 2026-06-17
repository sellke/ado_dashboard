import { buildProgramSnapshotSlide } from '@/lib/export/slides/program-snapshot';
import {
  buildWorkstreamSnapshotSlide,
  WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE,
} from '@/lib/export/slides/workstream-snapshot';
import type { ExportInput } from '@/lib/export/types';

function makeMockSlide() {
  return { addText: jest.fn(), addShape: jest.fn(), addChart: jest.fn(), addImage: jest.fn() };
}

function makeMockPrs() {
  const slide = makeMockSlide();
  return { addSlide: jest.fn(() => slide), _slide: slide };
}

function makeInput(overrides: Partial<ExportInput> = {}): ExportInput {
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
    ...overrides,
  };
}

describe('snapshot slide builders', () => {
  it('program snapshot renders placeholder when metrics are absent', async () => {
    const prs = makeMockPrs();
    await buildProgramSnapshotSlide(prs as never, makeInput(), { slideIndex: 1, totalSlides: 2 });
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('not yet available');
  });

  it('program snapshot renders health strip and metric tiles', async () => {
    const prs = makeMockPrs();
    await buildProgramSnapshotSlide(
      prs as never,
      makeInput({
        programMetrics: [
          { label: 'Velocity', value: '38 SP', rawValue: 38, unit: ' SP', rag: 'Green', avgLabel: null },
        ],
        visualizationSummary: {
          healthLabel: 'Healthy',
          ragCounts: { green: 1, amber: 0, red: 0, unset: 0 },
          sprintWindowLabel: 'Sprint 24',
          computedDateLabel: 'Jun 17, 2026',
          topRiskItems: [],
          caveats: [],
        },
      }),
      { slideIndex: 1, totalSlides: 2 }
    );
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('Healthy');
    expect(text).toContain('Velocity');
  });

  it('workstream snapshot paginates cards per slide constant', async () => {
    const cards = Array.from({ length: 6 }, (_, i) => ({
      workstreamId: `ws-${i}`,
      workstreamName: `Workstream ${i}`,
      keyMetrics: [{ label: 'Velocity', value: 'N/A', rag: null }],
      statusCue: null,
      primaryCaveat: null,
      milestoneSummary: null,
    }));
    const prs = makeMockPrs();
    await buildWorkstreamSnapshotSlide(
      prs as never,
      makeInput({ workstreamSnapshots: cards }),
      { slideIndex: 2, totalSlides: 3 },
      cards.slice(0, WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE),
      'Page 1/2'
    );
    expect(prs._slide.addShape.mock.calls.length).toBeGreaterThanOrEqual(
      WORKSTREAM_SNAPSHOT_CARDS_PER_SLIDE * 2
    );
  });

  it('workstream snapshot shows empty state when no cards on page', async () => {
    const prs = makeMockPrs();
    await buildWorkstreamSnapshotSlide(
      prs as never,
      makeInput(),
      { slideIndex: 2, totalSlides: 2 },
      []
    );
    const text = prs._slide.addText.mock.calls.map((c) => String(c[0])).join(' ');
    expect(text).toContain('No workstreams');
  });
});
