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
      computedAtLabel: '1/1/2026',
      programMetrics: null,
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
          computedAtLabel: null,
          programMetrics: null,
          workstreamCards: [],
        }}
      />
    );

    expect(screen.queryByText('Program Summary')).not.toBeInTheDocument();
  });
});
