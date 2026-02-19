/**
 * Tests for WorkstreamHealthCard component.
 * Verifies full-data, partial-data, and null-data workstream payloads.
 */
import { WorkstreamHealthCard } from '@/components/Dashboard/WorkstreamHealthCard';
import type { MetricTileViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

const createMetricTile = (overrides: Partial<MetricTileViewModel> = {}): MetricTileViewModel => ({
  label: 'Velocity',
  value: '128 pts',
  rawValue: 128,
  unit: 'pts',
  rag: 'Green',
  avgLabel: null,
  ...overrides,
});

const fullDataCard: WorkstreamCardViewModel = {
  workstreamId: 'ws-1',
  workstreamName: 'Platform',
  metrics: [
    createMetricTile({ label: 'Velocity', value: '45 pts', rawValue: 45, rag: 'Green' }),
    createMetricTile({ label: 'Overhead %', value: '28%', rawValue: 28, rag: 'Green' }),
    createMetricTile({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
  ],
  detail: {
    plannedPoints: '50',
    completedPoints: '45',
    carryOverItems: '3',
    carryOverPoints: '6',
  },
  trendSprints: [
    {
      sprintId: 's1',
      sprintName: 'Sprint 1',
      velocity: '10 pts',
      velocityRate: '0.17 pts/hr',
      activeBugs: '2',
      bugsClosed: '4',
      rawVelocity: 10,
      rawVelocityRate: 0.17,
      rawActiveBugs: 2,
      rawBugsClosed: 4,
    },
    {
      sprintId: 's2',
      sprintName: 'Sprint 2',
      velocity: '12 pts',
      velocityRate: '0.20 pts/hr',
      activeBugs: '1',
      bugsClosed: '5',
      rawVelocity: 12,
      rawVelocityRate: 0.2,
      rawActiveBugs: 1,
      rawBugsClosed: 5,
    },
  ],
};

describe('WorkstreamHealthCard', () => {
  it('renders workstream name', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('renders all 3 metrics with values and RAG badges when full data', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('45 pts')).toBeInTheDocument();
    expect(screen.getByText('Overhead %')).toBeInTheDocument();
    expect(screen.getByText('28%')).toBeInTheDocument();
    expect(screen.getByText('Carry-Over %')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();

    expect(screen.queryByText('Predictability')).not.toBeInTheDocument();

    const gBadges = screen.getAllByText('G');
    expect(gBadges.length).toBe(3);
  });

  it('renders N/A for null metric values', () => {
    const nullDataCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [
        createMetricTile({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Overhead %', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Carry-Over %', value: 'N/A', rawValue: null, rag: null }),
      ],
    };

    render(<WorkstreamHealthCard card={nullDataCard} />);

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(3);
  });

  it('renders detail block with planned/completed points and carry-over info', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByText(/Planned: 50/)).toBeInTheDocument();
    expect(screen.getByText(/Completed: 45/)).toBeInTheDocument();
    expect(screen.getByText(/Carry-over: 3 items, 6 pts/)).toBeInTheDocument();
  });

  it('renders trend rows for Sprint 1-4 metrics', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByText('Sprint Trend (1-4)')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText(/Velocity: 10 pts/)).toBeInTheDocument();
    expect(screen.getByText(/Velocity rate: 0.17 pts\/hr/)).toBeInTheDocument();
    expect(screen.getByText(/Active bugs: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Bugs closed: 4/)).toBeInTheDocument();
  });

  it('renders N/A for null detail values', () => {
    const nullDetailCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      detail: {
        plannedPoints: 'N/A',
        completedPoints: 'N/A',
        carryOverItems: 'N/A',
        carryOverPoints: 'N/A',
      },
    };

    render(<WorkstreamHealthCard card={nullDetailCard} />);

    expect(screen.getByText(/Planned: N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/Completed: N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/Carry-over: N\/A items, N\/A pts/)).toBeInTheDocument();
  });

  it('handles mixed RAG statuses', () => {
    const mixedRagCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [
        createMetricTile({ label: 'Velocity', rag: 'Green' }),
        createMetricTile({ label: 'Overhead %', rag: 'Amber' }),
        createMetricTile({ label: 'Carry-Over %', rag: 'Red' }),
      ],
    };

    render(<WorkstreamHealthCard card={mixedRagCard} />);

    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('handles empty metrics array without crashing', () => {
    const emptyMetricsCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [],
    };

    expect(() => {
      render(<WorkstreamHealthCard card={emptyMetricsCard} />);
    }).not.toThrow();

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText(/Planned: 50/)).toBeInTheDocument();
  });

  it('does not render trend section when trendSprints is empty', () => {
    const noTrendsCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      trendSprints: [],
    };

    render(<WorkstreamHealthCard card={noTrendsCard} />);

    expect(screen.queryByText('Sprint Trend (1-4)')).not.toBeInTheDocument();
  });

  it('RAG display does not break when metric values are null', () => {
    const partialNullCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [
        createMetricTile({ label: 'Velocity', value: 'N/A', rawValue: null, rag: 'Amber' }),
        createMetricTile({ label: 'Overhead %', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Carry-Over %', value: 'N/A', rawValue: null, rag: 'Red' }),
      ],
    };

    render(<WorkstreamHealthCard card={partialNullCard} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });
});
