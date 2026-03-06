import { render, screen } from '@testing-library/react';
import { AppLineChart } from '@/lib/charts/LineChart';

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

jest.mock('recharts', () => {
  const MockComponent = ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid={props['data-testid'] as string} data-props={JSON.stringify(props)}>
      {children as React.ReactNode}
    </div>
  );
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children, ...props }: Record<string, unknown>) => (
      <div data-testid="recharts-line-chart" data-props={JSON.stringify(props)}>
        {children as React.ReactNode}
      </div>
    ),
    Line: (props: Record<string, unknown>) => (
      <div
        data-testid={`line-${props.dataKey}`}
        data-stroke={props.stroke as string}
        data-stroke-dasharray={props.strokeDasharray as string}
        data-connect-nulls={String(props.connectNulls)}
      />
    ),
    XAxis: (props: Record<string, unknown>) => <div data-testid="x-axis" data-props={JSON.stringify(props)} />,
    YAxis: (props: Record<string, unknown>) => <div data-testid="y-axis" data-props={JSON.stringify(props)} />,
    CartesianGrid: (props: Record<string, unknown>) => <div data-testid="cartesian-grid" data-stroke={props.stroke as string} />,
    Tooltip: () => <div data-testid="tooltip" />,
    ReferenceLine: (props: Record<string, unknown>) => (
      <div data-testid="reference-line" data-y={String(props.y)} data-stroke={props.stroke as string} />
    ),
    Legend: MockComponent,
  };
});

const SAMPLE_DATA = [
  { sprint: 'S1', 'Completed Points': 40, Forecasted: null },
  { sprint: 'S2', 'Completed Points': 42, Forecasted: null },
  { sprint: 'S3', 'Completed Points': 45, Forecasted: 48 },
];

const SAMPLE_SERIES = [
  { name: 'Completed Points', color: 'blue.6' },
  { name: 'Forecasted', color: 'blue.6', strokeDasharray: '5 5' },
];

describe('AppLineChart', () => {
  it('renders without crashing', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} />
    );
    expect(screen.getByTestId('recharts-line-chart')).toBeInTheDocument();
  });

  it('renders a Line for each series entry', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} />
    );
    expect(screen.getByTestId('line-Completed Points')).toBeInTheDocument();
    expect(screen.getByTestId('line-Forecasted')).toBeInTheDocument();
  });

  it('resolves series colors through the theme', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} />
    );
    expect(screen.getByTestId('line-Completed Points').getAttribute('data-stroke')).toBe(
      'resolved(blue.6)'
    );
  });

  it('applies strokeDasharray for dashed series', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} />
    );
    expect(
      screen.getByTestId('line-Forecasted').getAttribute('data-stroke-dasharray')
    ).toBe('5 5');
  });

  it('renders default XAxis, YAxis, CartesianGrid, and Tooltip', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} />
    );
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('applies theme grid stroke to CartesianGrid', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} />
    );
    expect(screen.getByTestId('cartesian-grid').getAttribute('data-stroke')).toBe('#e9ecef');
  });

  it('renders reference lines when provided', () => {
    render(
      <AppLineChart
        data={SAMPLE_DATA}
        dataKey="sprint"
        series={SAMPLE_SERIES}
        referenceLines={[{ y: 42, color: 'gray.5', label: 'Avg: 42' }]}
      />
    );
    const refLine = screen.getByTestId('reference-line');
    expect(refLine).toBeInTheDocument();
    expect(refLine.getAttribute('data-y')).toBe('42');
    expect(refLine.getAttribute('data-stroke')).toBe('resolved(gray.5)');
  });

  it('passes connectNulls to Line components', () => {
    render(
      <AppLineChart
        data={SAMPLE_DATA}
        dataKey="sprint"
        series={[{ name: 'Completed Points', color: 'blue.6' }]}
        connectNulls={true}
      />
    );
    expect(
      screen.getByTestId('line-Completed Points').getAttribute('data-connect-nulls')
    ).toBe('true');
  });

  it('renders children as escape hatch', () => {
    render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES}>
        <div data-testid="custom-child">Custom overlay</div>
      </AppLineChart>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });

  it('uses specified height', () => {
    const { container } = render(
      <AppLineChart data={SAMPLE_DATA} dataKey="sprint" series={SAMPLE_SERIES} height={300} />
    );
    const wrapper = container.querySelector('.chart-container') as HTMLElement;
    expect(wrapper.style.height).toBe('300px');
  });
});
