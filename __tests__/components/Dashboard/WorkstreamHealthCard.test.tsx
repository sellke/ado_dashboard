import { WorkstreamHealthCard } from '@/components/Dashboard/WorkstreamHealthCard';
import type { MetricTileViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';
import { createWorkstreamCard } from './__fixtures__/dashboard-fixtures';

/**
 * Tests for WorkstreamHealthCard component.
 * Verifies full-data, partial-data, and null-data workstream payloads.
 * Integration tests for VelocityTrendChart and SprintBugList.
 */

jest.mock('@mantine/charts', () => ({
  LineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="velocity-line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-reference-lines={JSON.stringify(props.referenceLines)}
      data-h={String(props.h)}
    />
  ),
  BarChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-bar-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
    />
  ),
}));

const createMetricTile = (overrides: Partial<MetricTileViewModel> = {}): MetricTileViewModel => ({
  label: 'Velocity',
  value: '128 pts',
  rawValue: 128,
  unit: 'pts',
  rag: 'Green',
  avgLabel: null,
  ...overrides,
});

const fullDataCard: WorkstreamCardViewModel = createWorkstreamCard({
  workstreamId: 'ws-1',
  workstreamName: 'Platform',
  metrics: [
    createMetricTile({ label: 'Velocity', value: '45 pts', rawValue: 45, rag: 'Green' }),
    createMetricTile({ label: 'Velocity Rate', value: '0.85 pts/hr', rawValue: 0.85, rag: null }),
    createMetricTile({ label: 'Overhead %', value: '28%', rawValue: 28, rag: 'Green' }),
    createMetricTile({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
  ],
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
      bugs: [{ adoId: '12345', title: 'Login crash', isClosed: true }],
      overheadBreakdown: [],
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
      bugs: [{ adoId: '67890', title: 'Slow query', isClosed: false }],
      overheadBreakdown: [],
    },
  ],
  prediction: {
    velocity: '48 pts',
    rawVelocity: 48,
    velocityRate: '0.85 pts/hr',
    rawVelocityRate: 0.85,
    sprintLabel: 'Sprint 26.21',
    isPredicted: true,
  },
});

describe('WorkstreamHealthCard', () => {
  it('renders workstream name', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('renders all 4 metrics with values and RAG badges when full data', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    expect(screen.getByText('45 pts')).toBeInTheDocument();
    expect(screen.getByText('Velocity Rate')).toBeInTheDocument();
    expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();
    expect(screen.getByText('Overhead %')).toBeInTheDocument();
    expect(screen.getByText('28%')).toBeInTheDocument();
    expect(screen.getByText('Carry-Over %')).toBeInTheDocument();
    expect(screen.getByText('12%')).toBeInTheDocument();

    expect(screen.queryByText('Predictability')).not.toBeInTheDocument();

    // Velocity Rate has rag: null so no badge; 3 G badges from Velocity, Overhead %, Carry-Over %
    const gBadges = screen.getAllByText('G');
    expect(gBadges.length).toBe(3);
  });

  it('renders N/A for null metric values', () => {
    const nullDataCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [
        createMetricTile({ label: 'Velocity', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Velocity Rate', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Overhead %', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Carry-Over %', value: 'N/A', rawValue: null, rag: null }),
      ],
    };

    render(<WorkstreamHealthCard card={nullDataCard} />);

    expect(screen.getByText('Velocity')).toBeInTheDocument();
    const naElements = screen.getAllByText('N/A');
    expect(naElements.length).toBeGreaterThanOrEqual(4);
  });

  it('renders detail block with planned/completed points and carry-over info', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByText(/Planned: 50/)).toBeInTheDocument();
    expect(screen.getByText(/Completed: 45/)).toBeInTheDocument();
    expect(screen.getByText(/Carry-over: 3 items, 6 pts/)).toBeInTheDocument();
  });

  it('renders VelocityTrendChart when trend data is present', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByTestId('velocity-line-chart')).toBeInTheDocument();
    expect(screen.queryByText('No trend data available')).not.toBeInTheDocument();
  });

  it('renders SprintBugList below chart when trend sprints have bug data', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByTestId('sprint-bug-list')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    // Login crash appears in both SprintBugList (trend) and OverheadBreakdownPanel (current sprint items)
    expect(screen.getAllByText(/Login crash/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Slow query/).length).toBeGreaterThan(0);
  });

  it('passes prediction data to VelocityTrendChart', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    const chart = screen.getByTestId('velocity-line-chart');
    const points = JSON.parse(chart.getAttribute('data-points')!);
    expect(points).toHaveLength(3); // 2 sprints + 1 prediction
    expect(points[2].sprint).toContain('(Forecasted)');
    expect(points[2].Predicted).toBe(48);
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
        createMetricTile({ label: 'Velocity Rate', rag: null }),
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

  it('shows chart empty state and hides bug list when trendSprints is empty', () => {
    const noTrendsCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      trendSprints: [],
    };

    render(<WorkstreamHealthCard card={noTrendsCard} />);

    expect(screen.getByText('No trend data available')).toBeInTheDocument();
    expect(screen.queryByTestId('velocity-line-chart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sprint-bug-list')).not.toBeInTheDocument();
  });

  it('shows "(Projected)" suffix on velocity and velocity rate tiles when mode is projected', () => {
    const projectedCard: WorkstreamCardViewModel = createWorkstreamCard({
      metrics: [
        createMetricTile({ label: 'Velocity', value: '48 pts', mode: 'projected', rag: 'Green' }),
        createMetricTile({
          label: 'Velocity Rate',
          value: '0.85 pts/hr',
          mode: 'projected',
          rag: null,
        }),
        createMetricTile({ label: 'Overhead %', value: '28%', rag: 'Green' }),
        createMetricTile({ label: 'Carry-Over %', value: '12%', rag: 'Green' }),
      ],
    });

    render(<WorkstreamHealthCard card={projectedCard} />);

    const projectedLabels = screen.getAllByText(/(Projected)/);
    expect(projectedLabels.length).toBe(2);
    expect(screen.getByText('48 pts (Projected)')).toBeInTheDocument();
    expect(screen.getByText('0.85 pts/hr (Projected)')).toBeInTheDocument();
  });

  it('each card displays its own velocity chart and bug data when multiple cards render', () => {
    const card1 = createWorkstreamCard({
      workstreamId: 'ws-1',
      workstreamName: 'Platform',
      trendSprints: [
        {
          sprintId: 's1',
          sprintName: 'Sprint 1',
          velocity: '40 pts',
          velocityRate: '0.67 pts/hr',
          activeBugs: '2',
          bugsClosed: '5',
          rawVelocity: 40,
          rawVelocityRate: 0.67,
          rawActiveBugs: 2,
          rawBugsClosed: 5,
          bugs: [{ adoId: '1', title: 'Platform bug', isClosed: false }],
          overheadBreakdown: [],
        },
      ],
    });
    const card2 = createWorkstreamCard({
      workstreamId: 'ws-2',
      workstreamName: 'Apps',
      trendSprints: [
        {
          sprintId: 's2',
          sprintName: 'Sprint 2',
          velocity: '32 pts',
          velocityRate: '0.50 pts/hr',
          activeBugs: '1',
          bugsClosed: '3',
          rawVelocity: 32,
          rawVelocityRate: 0.5,
          rawActiveBugs: 1,
          rawBugsClosed: 3,
          bugs: [{ adoId: '2', title: 'Apps bug', isClosed: true }],
          overheadBreakdown: [],
        },
      ],
    });

    render(
      <>
        <WorkstreamHealthCard card={card1} />
        <WorkstreamHealthCard card={card2} />
      </>
    );

    const charts = screen.getAllByTestId('velocity-line-chart');
    expect(charts).toHaveLength(2);

    const bugLists = screen.getAllByTestId('sprint-bug-list');
    expect(bugLists).toHaveLength(2);

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByText(/Platform bug/)).toBeInTheDocument();
    expect(screen.getByText(/Apps bug/)).toBeInTheDocument();
  });

  it('chart and bug list stack vertically in card layout', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    const chart = screen.getByTestId('velocity-line-chart');
    const bugList = screen.getByTestId('sprint-bug-list');

    expect(chart).toBeInTheDocument();
    expect(bugList).toBeInTheDocument();

    // Chart should appear before bug list in DOM order (vertical stack)
    const ordered = document.querySelectorAll(
      '[data-testid="velocity-line-chart"], [data-testid="sprint-bug-list"]'
    );
    expect(ordered[0]).toHaveAttribute('data-testid', 'velocity-line-chart');
    expect(ordered[1]).toHaveAttribute('data-testid', 'sprint-bug-list');
  });

  it('RAG display does not break when metric values are null', () => {
    const partialNullCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [
        createMetricTile({ label: 'Velocity', value: 'N/A', rawValue: null, rag: 'Amber' }),
        createMetricTile({ label: 'Velocity Rate', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Overhead %', value: 'N/A', rawValue: null, rag: null }),
        createMetricTile({ label: 'Carry-Over %', value: 'N/A', rawValue: null, rag: 'Red' }),
      ],
    };

    render(<WorkstreamHealthCard card={partialNullCard} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  describe('OverheadBreakdownPanel integration', () => {
    it('renders overhead-breakdown-panel when overhead composition data is present', () => {
      render(<WorkstreamHealthCard card={fullDataCard} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders "Overhead Breakdown" section header', () => {
      render(<WorkstreamHealthCard card={fullDataCard} />);
      expect(screen.getByText('Overhead Breakdown')).toBeInTheDocument();
    });

    it('renders the overhead bar chart from fixture composition data', () => {
      render(<WorkstreamHealthCard card={fullDataCard} />);
      expect(screen.getByTestId('overhead-bar-chart')).toBeInTheDocument();
    });

    it('renders bug and support item tables', () => {
      render(<WorkstreamHealthCard card={fullDataCard} />);
      expect(screen.getByTestId('bug-items')).toBeInTheDocument();
      expect(screen.getByTestId('support-items')).toBeInTheDocument();
    });

    it('does not render overhead panel when all overhead data is absent', () => {
      const noOverheadCard: WorkstreamCardViewModel = {
        ...fullDataCard,
        overheadComposition: [],
        currentSprintBugItems: [],
        currentSprintSupportItems: [],
      };

      render(<WorkstreamHealthCard card={noOverheadCard} />);
      expect(screen.queryByTestId('overhead-breakdown-panel')).not.toBeInTheDocument();
    });

    it('renders panel when only bug items are present (no composition)', () => {
      const bugOnlyCard: WorkstreamCardViewModel = createWorkstreamCard({
        overheadComposition: [],
        currentSprintBugItems: [
          { adoId: '#99', title: 'Crash on load', state: 'Active', hours: '1 hr', isClosed: false },
        ],
        currentSprintSupportItems: [],
      });

      render(<WorkstreamHealthCard card={bugOnlyCard} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('overhead-bar-chart')).not.toBeInTheDocument();
    });

    it('renders panel when only support items are present', () => {
      const supportOnlyCard: WorkstreamCardViewModel = createWorkstreamCard({
        overheadComposition: [],
        currentSprintBugItems: [],
        currentSprintSupportItems: [
          { adoId: '#55', title: 'Deploy request', state: 'Done', hours: '2 hrs', isClosed: true },
        ],
      });

      render(<WorkstreamHealthCard card={supportOnlyCard} />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });
  });
});
