import { render, screen } from '@testing-library/react';
import { AppAreaChart } from '@/lib/charts/AreaChart';

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
  AreaChart: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="recharts-area-chart" data-props={JSON.stringify(props)}>
      {children as React.ReactNode}
    </div>
  ),
  Area: (props: Record<string, unknown>) => (
    <div
      data-testid={`area-${props.dataKey}`}
      data-stroke={props.stroke as string}
      data-fill={props.fill as string}
      data-fill-opacity={String(props.fillOpacity)}
      data-stroke-dasharray={props.strokeDasharray as string}
    />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: (props: Record<string, unknown>) => <div data-testid="cartesian-grid" data-stroke={props.stroke as string} />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

const BURNUP_DATA = [
  { sprint: 'S1', completedSP: 10, totalSP: 100 },
  { sprint: 'S2', completedSP: 30, totalSP: 100 },
  { sprint: 'S3', completedSP: 55, totalSP: 100 },
];

const BURNUP_SERIES = [
  { name: 'completedSP', label: 'Completed SP', color: 'teal.6' },
  { name: 'totalSP', label: 'Target SP', color: 'gray.4', strokeDasharray: '4 2' },
];

describe('AppAreaChart', () => {
  it('renders without crashing', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} />
    );
    expect(screen.getByTestId('recharts-area-chart')).toBeInTheDocument();
  });

  it('renders an Area for each series entry', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} />
    );
    expect(screen.getByTestId('area-completedSP')).toBeInTheDocument();
    expect(screen.getByTestId('area-totalSP')).toBeInTheDocument();
  });

  it('resolves series colors through the theme', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} />
    );
    expect(screen.getByTestId('area-completedSP').getAttribute('data-stroke')).toBe(
      'resolved(teal.6)'
    );
    expect(screen.getByTestId('area-completedSP').getAttribute('data-fill')).toBe(
      'resolved(teal.6)'
    );
  });

  it('applies fillOpacity of 0.3', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} />
    );
    expect(screen.getByTestId('area-completedSP').getAttribute('data-fill-opacity')).toBe('0.3');
  });

  it('applies strokeDasharray for dashed series', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} />
    );
    expect(
      screen.getByTestId('area-totalSP').getAttribute('data-stroke-dasharray')
    ).toBe('4 2');
  });

  it('renders default XAxis, YAxis, CartesianGrid, and Tooltip', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} />
    );
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('renders children as escape hatch', () => {
    render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES}>
        <div data-testid="custom-child">Overlay</div>
      </AppAreaChart>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });

  it('uses specified height', () => {
    const { container } = render(
      <AppAreaChart data={BURNUP_DATA} dataKey="sprint" series={BURNUP_SERIES} height={350} />
    );
    const wrapper = container.querySelector('.chart-container') as HTMLElement;
    expect(wrapper.style.height).toBe('350px');
  });
});
