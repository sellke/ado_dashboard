import { WorkstreamHealthCard } from '@/components/Dashboard/WorkstreamHealthCard';
import type { MetricTileViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';
import { createWorkstreamCard } from './__fixtures__/dashboard-fixtures';

/**
 * Tests for WorkstreamHealthCard component.
 * Verifies full-data, partial-data, and null-data workstream payloads.
 * Integration tests for VelocityTrendChart and OverheadBreakdownPanel.
 */

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => {
    const series = props.series as Array<{ name: string }> | undefined;
    const isOverhead = series?.some((s) => s.name === 'Mtgs');
    return (
      <div
        data-testid={isOverhead ? 'overhead-line-chart' : 'velocity-line-chart'}
        data-series={JSON.stringify(props.series)}
        data-points={JSON.stringify(props.data)}
        data-reference-lines={JSON.stringify(props.referenceLines)}
        data-height={String(props.height)}
      />
    );
  },
  AppBarChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-bar-chart"
      data-series={JSON.stringify(props.series)}
      data-data={JSON.stringify(props.data)}
    />
  ),
  ChartLegend: ({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) => (
    <div data-testid="chart-legend" data-items={JSON.stringify(items)} />
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

const enrichedDefaults = {
  velocityAvg: null as number | null,
  overheadPercentAvg: null as number | null,
  carryOverRateAvg: null as number | null,
  plannedPoints: null as number | null,
  completedPoints: null as number | null,
  carryOverPoints: null as number | null,
  grossHours: null as number | null,
  rawOverheadPercent: null as number | null,
  rawCarryOverRate: null as number | null,
};

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
      overheadBreakdown: [
        { category: 'Meetings' as const, hours: 10.25 },
        { category: 'Spikes' as const, hours: 4 },
        { category: 'Bugs' as const, hours: 5 },
        { category: 'Support' as const, hours: 3 },
      ],
      ...enrichedDefaults,
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
      overheadBreakdown: [
        { category: 'Meetings' as const, hours: 10.25 },
        { category: 'Spikes' as const, hours: 2 },
        { category: 'Bugs' as const, hours: 6 },
        { category: 'Support' as const, hours: 2 },
      ],
      ...enrichedDefaults,
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
    expect(screen.getByText(/Carry-over: 6 pts/)).toBeInTheDocument();
  });

  it('renders VelocityTrendChart when trend data is present', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    expect(screen.getByTestId('velocity-line-chart')).toBeInTheDocument();
    expect(screen.queryByText('No trend data available')).not.toBeInTheDocument();
  });

  it('passes prediction data to VelocityTrendChart', () => {
    render(<WorkstreamHealthCard card={fullDataCard} />);

    const chart = screen.getByTestId('velocity-line-chart');
    const points = JSON.parse(chart.getAttribute('data-points')!);
    expect(points).toHaveLength(3); // 2 sprints + 1 prediction
    expect(points[2].sprint).toContain('(Forecasted)');
    expect(points[2].Forecasted).toBe(48);
  });

  it('renders N/A for null detail values', () => {
    const nullDetailCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      detail: {
        plannedPoints: 'N/A',
        completedPoints: 'N/A',
        carryOverPoints: 'N/A',
      },
    };

    render(<WorkstreamHealthCard card={nullDetailCard} />);

    expect(screen.getByText(/Planned: N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/Completed: N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/Carry-over: N\/A pts/)).toBeInTheDocument();
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

  it('shows chart empty state when trendSprints is empty', () => {
    const noTrendsCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      trendSprints: [],
    };

    render(<WorkstreamHealthCard card={noTrendsCard} />);

    expect(screen.getByText('No trend data available')).toBeInTheDocument();
    expect(screen.queryByTestId('velocity-line-chart')).not.toBeInTheDocument();
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

  it('each card displays its own velocity chart when multiple cards render', () => {
    const card1 = createWorkstreamCard({
      workstreamId: 'ws-1',
      workstreamName: 'Platform',
    });
    const card2 = createWorkstreamCard({
      workstreamId: 'ws-2',
      workstreamName: 'Apps',
    });

    render(
      <>
        <WorkstreamHealthCard card={card1} />
        <WorkstreamHealthCard card={card2} />
      </>
    );

    const charts = screen.getAllByTestId('velocity-line-chart');
    expect(charts).toHaveLength(2);

    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
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

  describe('Story 3 — Metrics row responds to active sprint', () => {
    const enrichedCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      metrics: [
        createMetricTile({ label: 'Avg Velocity', value: '45 pts', rawValue: 45, rag: 'Green' }),
        createMetricTile({ label: 'Velocity Rate', value: '0.85 pts/hr', rawValue: 0.85, rag: null }),
        createMetricTile({ label: 'Overhead %', value: '28%', rawValue: 28, rag: 'Green' }),
        createMetricTile({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
      ],
      trendSprints: [
        {
          ...fullDataCard.trendSprints[0],
          sprintId: 'completed-sprint',
          sprintName: 'Sprint 26.18',
          velocityAvg: 42,
          overheadPercentAvg: 22.5,
          carryOverRateAvg: 8.75,
          rawVelocityRate: 0.65,
          plannedPoints: 50,
          completedPoints: 44,
          carryOverPoints: 6,
          grossHours: 320,
          rawOverheadPercent: 19.5,
          rawCarryOverRate: 12.0,
        },
        {
          ...fullDataCard.trendSprints[1],
          sprintId: 'current-sprint',
          sprintName: 'Sprint 26.19',
          velocityAvg: 45,
          overheadPercentAvg: 25,
          carryOverRateAvg: 10,
          plannedPoints: 48,
          completedPoints: 40,
          carryOverPoints: 8,
          grossHours: 300,
          rawOverheadPercent: 24.0,
          rawCarryOverRate: 16.67,
        },
      ],
    };

    it('overrides Avg Velocity with rolling velocityAvg when a non-current sprint is selected', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="completed-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('42 pts')).toBeInTheDocument();
    });

    it('overrides Velocity Rate with rawVelocityRate from matched trend sprint', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="completed-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('0.65 pts/hr')).toBeInTheDocument();
    });

    it('overrides Overhead % with actual rawOverheadPercent', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="completed-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('19.50%')).toBeInTheDocument();
    });

    it('overrides Carry-Over % with actual rawCarryOverRate', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="completed-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('12.00%')).toBeInTheDocument();
    });

    it('preserves default metrics when current sprint is selected', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="current-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('45 pts')).toBeInTheDocument();
      expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();
      expect(screen.getByText('28%')).toBeInTheDocument();
      expect(screen.getByText('12%')).toBeInTheDocument();
    });

    it('preserves default metrics when no activeSprintId is provided', () => {
      render(<WorkstreamHealthCard card={enrichedCard} />);
      expect(screen.getByText('45 pts')).toBeInTheDocument();
      expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();
    });

    it('shows N/A when enriched fields are null on matched sprint', () => {
      const nullEnrichedCard: WorkstreamCardViewModel = {
        ...fullDataCard,
        metrics: [
          createMetricTile({ label: 'Avg Velocity', value: '45 pts', rawValue: 45, rag: 'Green' }),
          createMetricTile({ label: 'Velocity Rate', value: '0.85 pts/hr', rawValue: 0.85, rag: null }),
          createMetricTile({ label: 'Overhead %', value: '28%', rawValue: 28, rag: 'Green' }),
          createMetricTile({ label: 'Carry-Over %', value: '12%', rawValue: 12, rag: 'Green' }),
        ],
        trendSprints: [
          {
            ...fullDataCard.trendSprints[0],
            sprintId: 'null-sprint',
            velocityAvg: null,
            rawVelocityRate: null,
            overheadPercentAvg: null,
            carryOverRateAvg: null,
          },
        ],
      };

      render(
        <WorkstreamHealthCard
          card={nullEnrichedCard}
          activeSprintId="null-sprint"
          currentSprintId="current-sprint"
        />
      );

      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThanOrEqual(4);
    });

    it('falls back to default metrics when no trend sprint matches activeSprintId', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="non-existent-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('45 pts')).toBeInTheDocument();
      expect(screen.getByText('0.85 pts/hr')).toBeInTheDocument();
    });
  });

  describe('Story 4 — Detail block responds to active sprint', () => {
    const enrichedCard: WorkstreamCardViewModel = {
      ...fullDataCard,
      trendSprints: [
        {
          ...fullDataCard.trendSprints[0],
          sprintId: 'completed-sprint',
          sprintName: 'Sprint 26.18',
          plannedPoints: 55,
          completedPoints: 48,
          carryOverPoints: 7,
          velocityAvg: 42,
          overheadPercentAvg: 22,
          carryOverRateAvg: 9,
          grossHours: 320,
          rawOverheadPercent: 20,
          rawCarryOverRate: (7 / 55) * 100,
        },
        {
          ...fullDataCard.trendSprints[1],
          sprintId: 'current-sprint',
          sprintName: 'Sprint 26.19',
          plannedPoints: 50,
          completedPoints: 40,
          carryOverPoints: 10,
          velocityAvg: 45,
          overheadPercentAvg: 25,
          carryOverRateAvg: 10,
          grossHours: 300,
          rawOverheadPercent: 24,
          rawCarryOverRate: (10 / 50) * 100,
        },
      ],
      detailSprintLabel: 'Sprint 26.17',
      detail: {
        plannedPoints: '50',
        completedPoints: '45',
        carryOverPoints: '6',
      },
    };

    it('shows selected sprint planned, completed, carry-over points when non-current sprint is active', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="completed-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText(/Planned: 55/)).toBeInTheDocument();
      expect(screen.getByText(/Completed: 48/)).toBeInTheDocument();
      expect(screen.getByText(/Carry-over: 7 pts/)).toBeInTheDocument();
    });

    it('updates detail label to selected sprint name', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="completed-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText('Sprint 26.18')).toBeInTheDocument();
      expect(screen.queryByText('Sprint 26.17')).not.toBeInTheDocument();
    });

    it('preserves default detail when current sprint is selected', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="current-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText(/Planned: 50/)).toBeInTheDocument();
      expect(screen.getByText(/Completed: 45/)).toBeInTheDocument();
      expect(screen.getByText(/Carry-over: 6 pts/)).toBeInTheDocument();
      expect(screen.getByText('Sprint 26.17')).toBeInTheDocument();
    });

    it('shows N/A when enriched detail fields are null', () => {
      const nullDetailCard: WorkstreamCardViewModel = {
        ...fullDataCard,
        trendSprints: [
          {
            ...fullDataCard.trendSprints[0],
            sprintId: 'null-sprint',
            sprintName: 'Sprint X',
            plannedPoints: null,
            completedPoints: null,
            carryOverPoints: null,
          },
        ],
      };

      render(
        <WorkstreamHealthCard
          card={nullDetailCard}
          activeSprintId="null-sprint"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText(/Planned: N\/A/)).toBeInTheDocument();
      expect(screen.getByText(/Completed: N\/A/)).toBeInTheDocument();
      expect(screen.getByText(/Carry-over: N\/A pts/)).toBeInTheDocument();
    });

    it('falls back to default detail when no trend sprint matches', () => {
      render(
        <WorkstreamHealthCard
          card={enrichedCard}
          activeSprintId="non-existent"
          currentSprintId="current-sprint"
        />
      );
      expect(screen.getByText(/Planned: 50/)).toBeInTheDocument();
      expect(screen.getByText(/Completed: 45/)).toBeInTheDocument();
    });
  });

  describe('OverheadBreakdownPanel integration', () => {
    it('renders overhead-breakdown-panel when overhead breakdown data is present', () => {
      render(<WorkstreamHealthCard card={fullDataCard} activeSprintId="s1" />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders "Overhead Breakdown" section header', () => {
      render(<WorkstreamHealthCard card={fullDataCard} activeSprintId="s1" />);
      expect(screen.getByText('Overhead Breakdown (Hours)')).toBeInTheDocument();
    });

    it('renders the overhead breakdown chart from fixture trend sprint data', () => {
      render(<WorkstreamHealthCard card={fullDataCard} activeSprintId="s1" />);
      expect(screen.getByTestId('overhead-line-chart')).toBeInTheDocument();
    });

    it('renders bug, spike, and support item tables', () => {
      render(<WorkstreamHealthCard card={fullDataCard} activeSprintId="s1" />);
      expect(screen.getByTestId('bug-items')).toBeInTheDocument();
      expect(screen.getByTestId('spike-items')).toBeInTheDocument();
      expect(screen.getByTestId('support-items')).toBeInTheDocument();
    });

    it('does not render overhead panel when all overhead data is absent', () => {
      const noOverheadCard: WorkstreamCardViewModel = {
        ...fullDataCard,
        trendSprints: fullDataCard.trendSprints.map((s) => ({
          ...s,
          overheadBreakdown: [],
        })),
        overheadItemsBySprint: [],
      };

      render(<WorkstreamHealthCard card={noOverheadCard} />);
      expect(screen.queryByTestId('overhead-breakdown-panel')).not.toBeInTheDocument();
    });

    it('renders panel when only bug items are present (no overhead breakdown)', () => {
      const bugOnlyCard: WorkstreamCardViewModel = createWorkstreamCard({
        trendSprints: createWorkstreamCard().trendSprints.map((s) => ({
          ...s,
          overheadBreakdown: [],
        })),
        overheadItemsBySprint: [
          {
            sprintId: 's1',
            bugs: [
              {
                adoId: '#99',
                title: 'Crash on load',
                state: 'Active',
                hours: '1 hr',
                isClosed: false,
                adoUrl: 'https://dev.azure.com/test/99',
              },
            ],
            spikes: [],
            support: [],
          },
        ],
      });

      render(<WorkstreamHealthCard card={bugOnlyCard} activeSprintId="s1" />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });

    it('renders panel when only support items are present', () => {
      const supportOnlyCard: WorkstreamCardViewModel = createWorkstreamCard({
        trendSprints: createWorkstreamCard().trendSprints.map((s) => ({
          ...s,
          overheadBreakdown: [],
        })),
        overheadItemsBySprint: [
          {
            sprintId: 's1',
            bugs: [],
            spikes: [],
            support: [
              {
                adoId: '#55',
                title: 'Deploy request',
                state: 'Done',
                hours: '2 hrs',
                isClosed: true,
                adoUrl: 'https://dev.azure.com/test/55',
              },
            ],
          },
        ],
      });

      render(<WorkstreamHealthCard card={supportOnlyCard} activeSprintId="s1" />);
      expect(screen.getByTestId('overhead-breakdown-panel')).toBeInTheDocument();
    });
  });
});
