import { render, screen } from '@/test-utils';
import { ChartLegend } from '@/lib/charts/ChartLegend';

jest.mock('@/lib/charts/theme', () => ({
  useChartTheme: jest.fn(() => ({
    resolveColor: (token: string) => {
      const map: Record<string, string> = {
        'blue.6': '#228be6',
        'red.6': '#fa5252',
        'green.6': '#40c057',
        'gray.5': '#adb5bd',
      };
      return map[token] ?? token;
    },
    isDark: false,
  })),
}));

describe('ChartLegend', () => {
  it('renders one item per entry', () => {
    render(
      <ChartLegend
        items={[
          { label: 'Completed', color: 'blue.6' },
          { label: 'Forecasted', color: 'red.6' },
        ]}
      />
    );
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Forecasted')).toBeInTheDocument();
  });

  it('renders solid indicator by default', () => {
    const { container } = render(
      <ChartLegend items={[{ label: 'Series A', color: 'blue.6' }]} />
    );
    const indicator = container.querySelector('[style*="border-top"]') as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.style.borderTop).toContain('solid');
    expect(indicator.style.borderTop).toContain('rgb(34, 139, 230)');
  });

  it('renders dashed indicator when dashed is true', () => {
    const { container } = render(
      <ChartLegend items={[{ label: 'Forecast', color: 'blue.6', dashed: true }]} />
    );
    const indicator = container.querySelector('[style*="border-top"]') as HTMLElement;
    expect(indicator).toBeTruthy();
    expect(indicator.style.borderTop).toContain('dashed');
  });

  it('resolves Mantine color tokens for indicator colors', () => {
    const { container } = render(
      <ChartLegend items={[{ label: 'Bugs', color: 'red.6' }]} />
    );
    const indicator = container.querySelector('[style*="border-top"]') as HTMLElement;
    expect(indicator.style.borderTop).toContain('rgb(250, 82, 82)');
  });

  it('renders multiple items with correct colors', () => {
    const { container } = render(
      <ChartLegend
        items={[
          { label: 'Blue', color: 'blue.6' },
          { label: 'Red', color: 'red.6' },
          { label: 'Green', color: 'green.6' },
        ]}
      />
    );
    const indicators = container.querySelectorAll('[style*="border-top"]');
    expect(indicators).toHaveLength(3);
  });

  it('renders empty list without errors', () => {
    const { container } = render(<ChartLegend items={[]} />);
    expect(container.firstChild).toBeTruthy();
  });
});
