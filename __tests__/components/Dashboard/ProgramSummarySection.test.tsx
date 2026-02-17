/**
 * Tests for ProgramSummarySection component.
 * Verifies populated state, null values, RAG indicators, sprint metadata, and empty states.
 */
import { ProgramSummarySection } from '@/components/Dashboard/ProgramSummarySection';
import type { DashboardViewModel, MetricTileViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

describe('ProgramSummarySection', () => {
  const populatedViewModel: DashboardViewModel = {
    state: 'success',
    sprintLabel: 'Sprint 26.21',
    rollingWindowLabel: 'Rolling 5 sprints (current + 4 prior)',
    computedAtLabel: '2/11/2026, 6:30:00 PM',
    programMetrics: [
      {
        label: 'Velocity',
        value: '128 pts',
        rawValue: 128,
        unit: 'pts',
        rag: 'Green',
        avgLabel: '120.5 pts',
      },
      {
        label: 'Overhead %',
        value: '31.2%',
        rawValue: 31.2,
        unit: '%',
        rag: 'Amber',
        avgLabel: null,
      },
      {
        label: 'Predictability',
        value: '87%',
        rawValue: 87,
        unit: '%',
        rag: 'Red',
        avgLabel: '82%',
      },
      {
        label: 'Carry-over Rate',
        value: '0.15',
        rawValue: 0.15,
        unit: '',
        rag: 'Green',
        avgLabel: null,
      },
    ],
    programTrendSprints: [
      {
        sprintId: 's1',
        sprintName: 'Sprint 1',
        velocity: '120 pts',
        velocityRate: '1.40 pts/hr',
        activeBugs: '10',
        bugsClosed: '14',
      },
      {
        sprintId: 's2',
        sprintName: 'Sprint 2',
        velocity: '126 pts',
        velocityRate: '1.55 pts/hr',
        activeBugs: '8',
        bugsClosed: '15',
      },
    ],
    sprint5Prediction: {
      velocity: '132 pts',
      isPredicted: true,
    },
    workstreamCards: [],
  };

  it('renders all 4 metrics with values and RAG indicators when populated', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 26\.21/)).toBeInTheDocument();
    expect(screen.getByText(/2\/11\/2026/)).toBeInTheDocument();

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('128 pts')).toBeInTheDocument();
    expect(screen.getByText(/Avg: 120\.5 pts/)).toBeInTheDocument();

    expect(screen.getByText('Overhead %')).toBeInTheDocument();
    expect(screen.getByText('31.2%')).toBeInTheDocument();

    expect(screen.getByText('Predictability')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();

    expect(screen.getByText('Carry-over Rate')).toBeInTheDocument();
    expect(screen.getByText('0.15')).toBeInTheDocument();

    // RAG badges present (short labels G, A, R)
    expect(screen.getAllByText('G').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('renders Sprint 1-4 trend rows and Sprint 5 predicted velocity', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Sprint 1-4 Trend')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText(/Velocity: 120 pts/)).toBeInTheDocument();
    expect(screen.getByText(/Velocity rate: 1.40 pts\/hr/)).toBeInTheDocument();
    expect(screen.getByText(/Active bugs: 10/)).toBeInTheDocument();
    expect(screen.getByText(/Bugs closed: 14/)).toBeInTheDocument();

    expect(screen.getByText('Sprint 5 Predicted Velocity')).toBeInTheDocument();
    expect(screen.getByText('132 pts (Predicted)')).toBeInTheDocument();
  });

  it('renders N/A for metrics with null values with stable layout', () => {
    const vmWithNulls: DashboardViewModel = {
      ...populatedViewModel,
      programMetrics: [
        {
          label: 'Velocity',
          value: 'N/A',
          rawValue: null,
          unit: 'pts',
          rag: null,
          avgLabel: null,
        },
        {
          label: 'Overhead %',
          value: 'N/A',
          rawValue: null,
          unit: '%',
          rag: 'Amber',
          avgLabel: null,
        },
      ] as MetricTileViewModel[],
    };

    render(<ProgramSummarySection viewModel={vmWithNulls} />);

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Overhead %')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders different RAG colors on different metrics', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    const gBadges = screen.getAllByText('G');
    const aBadges = screen.getAllByText('A');
    const rBadges = screen.getAllByText('R');

    expect(gBadges.length).toBeGreaterThanOrEqual(1);
    expect(aBadges.length).toBe(1);
    expect(rBadges.length).toBe(1);
  });

  it('renders sprint label and computedAt freshness', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText(/Sprint 26\.21/)).toBeInTheDocument();
    expect(screen.getByText(/2\/11\/2026/)).toBeInTheDocument();
  });

  it('handles null sprint label and computedAt gracefully', () => {
    const vmNullMetadata: DashboardViewModel = {
      ...populatedViewModel,
      sprintLabel: null,
      rollingWindowLabel: null,
      computedAtLabel: null,
    };

    render(<ProgramSummarySection viewModel={vmNullMetadata} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText('Velocity')).toBeInTheDocument();
  });

  it('shows placeholder when programMetrics is null', () => {
    const vmNoMetrics: DashboardViewModel = {
      state: 'success',
      sprintLabel: 'Sprint 1',
      rollingWindowLabel: null,
      computedAtLabel: '1/1/2026',
      programMetrics: null,
      programTrendSprints: [],
      sprint5Prediction: null,
      workstreamCards: [],
    };

    render(<ProgramSummarySection viewModel={vmNoMetrics} />);

    expect(screen.getByText('Program Summary')).toBeInTheDocument();
    expect(screen.getByText('No program metrics available')).toBeInTheDocument();
  });

  it('displays avgLabel when provided', () => {
    render(<ProgramSummarySection viewModel={populatedViewModel} />);

    expect(screen.getByText(/Avg: 120\.5 pts/)).toBeInTheDocument();
    expect(screen.getByText(/Avg: 82%/)).toBeInTheDocument();
  });

  it('returns null when viewModel.state is not success', () => {
    render(
      <ProgramSummarySection
        viewModel={{
          state: 'loading',
          sprintLabel: null,
          rollingWindowLabel: null,
          computedAtLabel: null,
          programMetrics: null,
          programTrendSprints: [],
          sprint5Prediction: null,
          workstreamCards: [],
        }}
      />
    );

    expect(screen.queryByText('Program Summary')).not.toBeInTheDocument();
  });

  it('does not render trend section when programTrendSprints is empty', () => {
    const vmNoTrend: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [],
      sprint5Prediction: null,
    };

    render(<ProgramSummarySection viewModel={vmNoTrend} />);

    expect(screen.queryByText('Sprint 1-4 Trend')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint 5 Predicted Velocity')).not.toBeInTheDocument();
  });

  it('renders N/A placeholders for partial trend data without layout breakage', () => {
    const vmPartialTrend: DashboardViewModel = {
      ...populatedViewModel,
      programTrendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: 'N/A',
          velocityRate: 'N/A',
          activeBugs: 'N/A',
          bugsClosed: 'N/A',
        },
      ],
      sprint5Prediction: { velocity: 'N/A', isPredicted: true },
    };

    render(<ProgramSummarySection viewModel={vmPartialTrend} />);

    expect(screen.getByText('Sprint 1-4 Trend')).toBeInTheDocument();
    expect(screen.getByText(/Velocity: N\/A/)).toBeInTheDocument();
    expect(screen.getByText('Sprint 5 Predicted Velocity')).toBeInTheDocument();
    expect(screen.getByText('N/A (Predicted)')).toBeInTheDocument();
  });
});
