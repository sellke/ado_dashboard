import { render, screen } from '@testing-library/react';
import { AppBarChart } from '@/lib/charts/BarChart';

jest.mock('@/lib/charts/theme', () => ({
  useChartTheme: jest.fn(() => ({
    resolveColor: (t: string) => `resolved(${t})`,
    axisTickFill: '#868e96',
    gridStroke: '#e9ecef',
    tooltipBackground: 'rgba(255,255,255,0.95)',
    tooltipText: '#212529',
    tooltipBorder: '#e9ecef',
    chartBackground: 'transparent',
    isDark: false,
  })),
}));

jest.mock('@/lib/charts/ChartTooltip', () => ({
  ChartTooltip: () => <div data-testid="chart-tooltip" />,
}));

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="recharts-bar-chart" data-props={JSON.stringify(props)}>
      {children as React.ReactNode}
    </div>
  ),
  Bar: (props: Record<string, unknown>) => (
    <div
      data-testid={`bar-${props.dataKey}`}
      data-fill={props.fill as string}
      data-stack-id={props.stackId as string}
    />
  ),
  XAxis: (props: Record<string, unknown>) => <div data-testid="x-axis" data-props={JSON.stringify(props)} />,
  YAxis: (props: Record<string, unknown>) => <div data-testid="y-axis" data-props={JSON.stringify(props)} />,
  CartesianGrid: (props: Record<string, unknown>) => <div data-testid="cartesian-grid" data-stroke={props.stroke as string} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const SAMPLE_DATA = [
  { sprint: 'S1', Ceremony: 5, Bugs: 3, Spikes: 2, Support: 1 },
  { sprint: 'S2', Ceremony: 4, Bugs: 5, Spikes: 1, Support: 2 },
];

const STACKED_SERIES = [
  { name: 'Ceremony', color: 'blue.6' },
  { name: 'Bugs', color: 'red.6' },
  { name: 'Spikes', color: 'orange.6' },
  { name: 'Support', color: 'yellow.6' },
];

describe('AppBarChart', () => {
  it('renders without crashing', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} />
    );
    expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument();
  });

  it('renders a Bar for each series entry', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} />
    );
    expect(screen.getByTestId('bar-Ceremony')).toBeInTheDocument();
    expect(screen.getByTestId('bar-Bugs')).toBeInTheDocument();
    expect(screen.getByTestId('bar-Spikes')).toBeInTheDocument();
    expect(screen.getByTestId('bar-Support')).toBeInTheDocument();
  });

  it('resolves series colors through the theme', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} />
    );
    expect(screen.getByTestId('bar-Ceremony').getAttribute('data-fill')).toBe('resolved(blue.6)');
    expect(screen.getByTestId('bar-Bugs').getAttribute('data-fill')).toBe('resolved(red.6)');
  });

  it('applies stackId when type is "stacked"', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} type="stacked" />
    );
    expect(screen.getByTestId('bar-Ceremony').getAttribute('data-stack-id')).toBe('stack');
    expect(screen.getByTestId('bar-Bugs').getAttribute('data-stack-id')).toBe('stack');
  });

  it('does not apply stackId when type is "default"', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} type="default" />
    );
    expect(screen.getByTestId('bar-Ceremony').getAttribute('data-stack-id')).toBeNull();
  });

  it('renders Legend when withLegend is true', () => {
    render(
      <AppBarChart
        data={SAMPLE_DATA}
        dataKey="sprint"
        series={STACKED_SERIES}
        withLegend
      />
    );
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('does not render Legend by default', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} />
    );
    expect(screen.queryByTestId('legend')).not.toBeInTheDocument();
  });

  it('renders default XAxis, YAxis, CartesianGrid, and Tooltip', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES} />
    );
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('renders children as escape hatch', () => {
    render(
      <AppBarChart data={SAMPLE_DATA} dataKey="sprint" series={STACKED_SERIES}>
        <div data-testid="custom-child">Overlay</div>
      </AppBarChart>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });
});
