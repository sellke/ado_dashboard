import { VelocityTrendChart } from '@/components/Dashboard/VelocityTrendChart';
import type { TrendSprintViewModel, WorkstreamCardViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

/**
 * Tests for VelocityTrendChart component.
 * Verifies: renders with data, empty state, reference line, prediction point.
 */

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="velocity-line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-reference-lines={JSON.stringify(props.referenceLines)}
      data-height={String(props.height)}
    />
  ),
  ChartLegend: ({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) => (
    <div data-testid="chart-legend" data-items={JSON.stringify(items)} />
  ),
}));

function makeSprint(overrides: Partial<TrendSprintViewModel> = {}): TrendSprintViewModel {
  return {
    sprintId: 's1',
    sprintName: 'Sprint 1',
    isCurrent: false,
    velocity: '40 pts',
    velocityRate: '0.67 pts/hr',
    activeBugs: '2',
    bugsClosed: '3',
    rawVelocity: 40,
    rawVelocityRate: 0.67,
    rawActiveBugs: 2,
    rawBugsClosed: 3,
    bugs: [],
    overheadBreakdown: [],
    velocityAvg: null,
    overheadPercentAvg: null,
    carryOverRateAvg: null,
    plannedPoints: null,
    completedPoints: null,
    carryOverPoints: null,
    grossHours: null,
    rawOverheadPercent: null,
    rawCarryOverRate: null,
    ...overrides,
  };
}

const fourSprints: TrendSprintViewModel[] = [
  makeSprint({ sprintId: 's1', sprintName: 'Sprint 26.17', rawVelocity: 38 }),
  makeSprint({ sprintId: 's2', sprintName: 'Sprint 26.18', rawVelocity: 42 }),
  makeSprint({ sprintId: 's3', sprintName: 'Sprint 26.19', rawVelocity: 45 }),
  makeSprint({ sprintId: 's4', sprintName: 'Sprint 26.20', rawVelocity: 40 }),
];

const prediction: WorkstreamCardViewModel['prediction'] = {
  velocity: '48 pts',
  rawVelocity: 48,
  velocityRate: '0.85 pts/hr',
  rawVelocityRate: 0.85,
  sprintLabel: 'Sprint 26.21',
  isPredicted: true,
};

function parseReferenceLines(chart: HTMLElement) {
  return JSON.parse(chart.getAttribute('data-reference-lines')!) as Array<{
    y?: number;
    x?: string;
    color?: string;
    label?: string;
  }>;
}

describe('VelocityTrendChart', () => {
  describe('empty state', () => {
    it('shows "No trend data available" when trendSprints is empty', () => {
      render(<VelocityTrendChart trendSprints={[]} prediction={null} />);

      expect(screen.getByText('No trend data available')).toBeInTheDocument();
      expect(screen.queryByTestId('velocity-line-chart')).not.toBeInTheDocument();
    });
  });

  describe('renders with data', () => {
    it('renders a LineChart when trend sprints are provided', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      expect(screen.getByTestId('velocity-line-chart')).toBeInTheDocument();
      expect(screen.queryByText('No trend data available')).not.toBeInTheDocument();
    });

    it('passes one data point per sprint to the chart', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(4);
      expect(points[0].sprint).toBe('Sprint 26.17');
      expect(points[0]['Completed Points']).toBe(38);
      expect(points[3].sprint).toBe('Sprint 26.20');
    });

    it('renders both "Completed Points" and "Forecasted" series', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);
      expect(series).toEqual([
        { name: 'Completed Points', color: 'blue.6' },
        { name: 'Forecasted', color: 'blue.4', strokeDasharray: '5 5' },
      ]);
    });

    it('has chart height of 200', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      expect(chart.getAttribute('data-height')).toBe('200');
    });

    it('omits Completed Points for sprints with null rawVelocity', () => {
      const sprintsWithNull = [
        makeSprint({ sprintId: 's1', sprintName: 'Sprint 1', rawVelocity: 40 }),
        makeSprint({ sprintId: 's2', sprintName: 'Sprint 2', rawVelocity: null }),
        makeSprint({ sprintId: 's3', sprintName: 'Sprint 3', rawVelocity: 45 }),
      ];

      render(<VelocityTrendChart trendSprints={sprintsWithNull} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points[1]).not.toHaveProperty('Completed Points');
      expect(points[0]['Completed Points']).toBe(40);
      expect(points[2]['Completed Points']).toBe(45);
    });
  });

  describe('prediction point', () => {
    it('places the forecast value on the last sprint data point (no extra entry)', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={prediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      // No new x-axis entry — same 4 sprints
      expect(points).toHaveLength(4);
      expect(points[3].sprint).toBe('Sprint 26.20');
      expect(points[3].Forecasted).toBe(48);
    });

    it('bridges the prior sprint so the dashed line has a connecting segment', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={prediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      // Bridge is on the sprint BEFORE the forecast target
      expect(points[2].Forecasted).toBe(points[2]['Completed Points']);
      // The forecast target itself carries the predicted value, not its own actual
      expect(points[3].Forecasted).toBe(48);
    });

    it('never appends a "(Forecasted)" label entry to the data', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={prediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      const hasForecasted = points.some(
        (p: Record<string, unknown>) =>
          typeof p.sprint === 'string' && String(p.sprint).includes('(Forecasted)')
      );
      expect(hasForecasted).toBe(false);
    });

    it('renders without prediction segment when prediction is null', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(4);
      points.forEach((p: Record<string, unknown>) => {
        expect(p).not.toHaveProperty('Forecasted');
      });
    });

    it('handles null rawVelocity on prediction gracefully', () => {
      const nullPrediction: WorkstreamCardViewModel['prediction'] = {
        ...prediction,
        rawVelocity: null,
      };

      render(<VelocityTrendChart trendSprints={fourSprints} prediction={nullPrediction} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      // No Forecasted key on any point when rawVelocity is null
      points.forEach((p: Record<string, unknown>) => {
        expect(p).not.toHaveProperty('Forecasted');
      });
    });
  });

  describe('reference line (rolling average)', () => {
    it('passes a reference line with the computed rolling average', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = JSON.parse(chart.getAttribute('data-reference-lines')!);
      // avg of 38, 42, 45, 40 = 41.25
      expect(referenceLines).toHaveLength(1);
      expect(referenceLines[0].y).toBe(41.25);
      expect(referenceLines[0].label).toMatch(/Avg: 41\.25/);
      expect(referenceLines[0].color).toBe('gray.5');
    });

    it('passes empty referenceLines when all velocities are null', () => {
      const nullSprints = [
        makeSprint({ sprintId: 's1', rawVelocity: null }),
        makeSprint({ sprintId: 's2', rawVelocity: null }),
      ];

      render(<VelocityTrendChart trendSprints={nullSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = parseReferenceLines(chart);
      expect(referenceLines).toHaveLength(0);
    });
  });

  describe('current sprint overlay (isCurrent)', () => {
    const fourActualSprints: TrendSprintViewModel[] = [
      makeSprint({ sprintId: 's1', sprintName: 'Sprint 26.17', rawVelocity: 38 }),
      makeSprint({ sprintId: 's2', sprintName: 'Sprint 26.18', rawVelocity: 42 }),
      makeSprint({ sprintId: 's3', sprintName: 'Sprint 26.19', rawVelocity: 45 }),
      makeSprint({ sprintId: 's4', sprintName: 'Sprint 26.20', rawVelocity: 40 }),
    ];
    const currentSprint = makeSprint({
      sprintId: 's5',
      sprintName: 'Sprint 26.21',
      rawVelocity: 12,
      isCurrent: true,
    });
    const fiveSprintsWithCurrent = [...fourActualSprints, currentSprint];

    it('places Forecasted on the current sprint data point when last sprint is current', () => {
      render(
        <VelocityTrendChart
          trendSprints={fiveSprintsWithCurrent}
          prediction={prediction}
          currentSprintId="s5"
        />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      // 5 sprints — no extra forecast entry appended
      expect(points).toHaveLength(5);
      const lastPoint = points[4];
      expect(lastPoint.sprint).toBe('Sprint 26.21');
      expect(lastPoint.Forecasted).toBe(48);
    });

    it('does NOT append a separate forecasted entry when current sprint is last', () => {
      render(
        <VelocityTrendChart
          trendSprints={fiveSprintsWithCurrent}
          prediction={prediction}
          currentSprintId="s5"
        />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      const hasForecasted = points.some(
        (p: Record<string, unknown>) => typeof p.sprint === 'string' && String(p.sprint).includes('(Forecasted)')
      );
      expect(hasForecasted).toBe(false);
    });

    it('marks the current sprint data point with isCurrentSprint: true', () => {
      render(
        <VelocityTrendChart
          trendSprints={fiveSprintsWithCurrent}
          prediction={null}
          currentSprintId="s5"
        />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points[4].isCurrentSprint).toBe(true);
      expect(points.slice(0, 4).every((p: Record<string, unknown>) => !p.isCurrentSprint)).toBe(true);
    });

    it('falls back to last sprint when no sprint is marked isCurrent', () => {
      render(
        <VelocityTrendChart
          trendSprints={fourSprints}
          prediction={prediction}
        />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      // Still 4 points — forecast merges onto the last sprint, no new entry
      expect(points).toHaveLength(4);
      expect(points[3].sprint).toBe('Sprint 26.20');
      expect(points[3].Forecasted).toBe(48);
    });

    it('places no Forecasted on current sprint when prediction.rawVelocity is null', () => {
      const nullPrediction: WorkstreamCardViewModel['prediction'] = {
        ...prediction,
        rawVelocity: null,
      };

      render(
        <VelocityTrendChart
          trendSprints={fiveSprintsWithCurrent}
          prediction={nullPrediction}
          currentSprintId="s5"
        />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const points = JSON.parse(chart.getAttribute('data-points')!);
      expect(points).toHaveLength(5);
      expect(points[4]).not.toHaveProperty('Forecasted');
    });
  });

  describe('activeSprintId highlight', () => {
    it('adds an x-reference line for the active sprint', () => {
      render(
        <VelocityTrendChart trendSprints={fourSprints} prediction={null} activeSprintId="s2" />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = parseReferenceLines(chart);
      const xRef = referenceLines.find((r) => r.x != null);
      expect(xRef).toBeDefined();
      expect(xRef!.x).toBe('Sprint 26.18');
      expect(xRef!.color).toBe('gray.5');
    });

    it('does not add x-reference line when activeSprintId is undefined', () => {
      render(<VelocityTrendChart trendSprints={fourSprints} prediction={null} />);

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = parseReferenceLines(chart);
      const xRef = referenceLines.find((r) => r.x != null);
      expect(xRef).toBeUndefined();
    });

    it('does not add x-reference line when activeSprintId does not match any sprint', () => {
      render(
        <VelocityTrendChart
          trendSprints={fourSprints}
          prediction={null}
          activeSprintId="nonexistent"
        />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = parseReferenceLines(chart);
      const xRef = referenceLines.find((r) => r.x != null);
      expect(xRef).toBeUndefined();
    });

    it('preserves the rolling average y-reference line alongside the x-reference line', () => {
      render(
        <VelocityTrendChart trendSprints={fourSprints} prediction={null} activeSprintId="s3" />
      );

      const chart = screen.getByTestId('velocity-line-chart');
      const referenceLines = parseReferenceLines(chart);
      expect(referenceLines).toHaveLength(2);
      expect(referenceLines.find((r) => r.y != null)).toBeDefined();
      expect(referenceLines.find((r) => r.x != null)!.x).toBe('Sprint 26.19');
    });

    it('highlight moves when activeSprintId changes', () => {
      const { rerender } = render(
        <VelocityTrendChart trendSprints={fourSprints} prediction={null} activeSprintId="s1" />
      );

      let chart = screen.getByTestId('velocity-line-chart');
      let xRef = parseReferenceLines(chart).find((r) => r.x != null);
      expect(xRef!.x).toBe('Sprint 26.17');

      rerender(
        <VelocityTrendChart trendSprints={fourSprints} prediction={null} activeSprintId="s4" />
      );

      chart = screen.getByTestId('velocity-line-chart');
      xRef = parseReferenceLines(chart).find((r) => r.x != null);
      expect(xRef!.x).toBe('Sprint 26.20');
    });
  });
});
