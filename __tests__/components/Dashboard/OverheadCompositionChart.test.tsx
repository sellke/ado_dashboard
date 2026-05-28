import { createOverheadCompositionViewModel } from '@/__tests__/components/Dashboard/__fixtures__/dashboard-fixtures';
import { OverheadCompositionChart } from '@/components/Dashboard/OverheadCompositionChart';
import type { OverheadCompositionViewModel } from '@/lib/dashboard/types';
import { render, screen } from '@/test-utils';

/**
 * Tests for OverheadCompositionChart component.
 * Verifies: renders chart, handles empty array, correct series, data mapping.
 */

jest.mock('@/lib/charts', () => ({
  AppLineChart: (props: Record<string, unknown>) => (
    <div
      data-testid="overhead-line-chart"
      data-series={JSON.stringify(props.series)}
      data-points={JSON.stringify(props.data)}
      data-height={String(props.height)}
      data-with-dots={String(props.withDots)}
    />
  ),
  ChartLegend: ({ items }: { items: Array<{ label: string; color: string }> }) => (
    <div data-testid="chart-legend" data-items={JSON.stringify(items)} />
  ),
}));

function makeSprint(
  overrides: Partial<OverheadCompositionViewModel> = {}
): OverheadCompositionViewModel {
  return createOverheadCompositionViewModel(overrides);
}

const fiveSprints: OverheadCompositionViewModel[] = [
  makeSprint({
    sprintName: 'Sprint 26.22',
    ceremonyHours: 8,
    bugHours: 4,
    spikeHours: 2,
    supportHours: 1,
  }),
  makeSprint({
    sprintName: 'Sprint 26.23',
    ceremonyHours: 9,
    bugHours: 3,
    spikeHours: 0,
    supportHours: 2,
  }),
  makeSprint({
    sprintName: 'Sprint 26.24',
    ceremonyHours: 10,
    bugHours: 5,
    spikeHours: 1,
    supportHours: 3,
  }),
  makeSprint({
    sprintName: 'Sprint 26.25',
    ceremonyHours: 7,
    bugHours: 2,
    spikeHours: 4,
    supportHours: 0,
  }),
  makeSprint({
    sprintName: 'Sprint 26.26',
    ceremonyHours: 11,
    bugHours: 6,
    spikeHours: 2,
    supportHours: 2,
  }),
];

describe('OverheadCompositionChart', () => {
  describe('empty state', () => {
    it('renders nothing when composition is empty', () => {
      render(<OverheadCompositionChart composition={[]} />);
      expect(screen.queryByTestId('overhead-line-chart')).not.toBeInTheDocument();
    });
  });

  describe('renders with data', () => {
    it('renders a line chart when composition data is provided', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);
      expect(screen.getByTestId('overhead-line-chart')).toBeInTheDocument();
    });

    it('passes one data point per sprint (5 sprints → 5 points)', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const data = JSON.parse(chart.getAttribute('data-points')!);
      expect(data).toHaveLength(5);
    });

    it('maps OverheadCompositionViewModel to correct line chart data keys', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const data = JSON.parse(chart.getAttribute('data-points')!);

      expect(data[0]).toMatchObject({
        sprint: 'Sprint 26.22',
        Meetings: 8,
        Bugs: 4,
        Spikes: 2,
        Support: 1,
      });
      expect(data[4]).toMatchObject({
        sprint: 'Sprint 26.26',
        Meetings: 11,
        Bugs: 6,
        Spikes: 2,
        Support: 2,
      });
    });

    it('includes zero-value bug hours in the data point (not omitted)', () => {
      const sprintWithZeroBugs = makeSprint({ sprintName: 'Sprint 1', bugHours: 0 });
      render(<OverheadCompositionChart composition={[sprintWithZeroBugs]} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const data = JSON.parse(chart.getAttribute('data-points')!);
      expect(data[0].Bugs).toBe(0);
    });
  });

  describe('series configuration', () => {
    it('renders four series: Meetings, Bugs, Spikes, Support', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);

      expect(series).toHaveLength(4);
      const names = series.map((s: { name: string }) => s.name);
      expect(names).toEqual(['Meetings', 'Bugs', 'Spikes', 'Support']);
    });

    it('assigns distinct colors to each series', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      const series = JSON.parse(chart.getAttribute('data-series')!);

      const colors = series.map((s: { color: string }) => s.color);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });

  describe('chart configuration', () => {
    it('has chart height of 200', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      expect(chart.getAttribute('data-height')).toBe('200');
    });

    it('renders a legend with four items', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const legend = screen.getByTestId('chart-legend');
      const items = JSON.parse(legend.getAttribute('data-items')!);
      expect(items).toHaveLength(4);
      expect(items.map((i: { label: string }) => i.label)).toEqual([
        'Meetings',
        'Bugs',
        'Spikes',
        'Support',
      ]);
    });

    it('uses dots on series', () => {
      render(<OverheadCompositionChart composition={fiveSprints} />);

      const chart = screen.getByTestId('overhead-line-chart');
      expect(chart.getAttribute('data-with-dots')).toBe('true');
    });
  });
});
