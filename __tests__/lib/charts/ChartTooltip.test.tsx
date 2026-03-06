import { render, screen } from '@/test-utils';
import { ChartTooltip } from '@/lib/charts/ChartTooltip';

const mockTheme = {
  resolveColor: (t: string) => t,
  axisTickFill: '#868e96',
  gridStroke: '#e9ecef',
  tooltipBackground: 'rgba(255,255,255,0.95)',
  tooltipText: 'var(--mantine-color-dark-7)',
  tooltipBorder: 'var(--mantine-color-gray-2)',
  chartBackground: 'transparent',
  isDark: false,
};

jest.mock('@/lib/charts/theme', () => ({
  useChartTheme: jest.fn(() => mockTheme),
}));

import { useChartTheme } from '@/lib/charts/theme';

describe('ChartTooltip', () => {
  it('returns null when not active', () => {
    const { container } = render(
      <ChartTooltip active={false} payload={[{ name: 'A', value: 10 }]} />
    );
    expect(container.querySelector('span, p, div:not(#root)')).toBeNull();
  });

  it('returns null when payload is undefined', () => {
    const { container } = render(<ChartTooltip active={true} />);
    expect(container.querySelector('span, p, div:not(#root)')).toBeNull();
  });

  it('returns null when all values are null', () => {
    const { container } = render(
      <ChartTooltip active={true} payload={[{ name: 'A', value: null }]} />
    );
    expect(container.querySelector('span, p, div:not(#root)')).toBeNull();
  });

  it('returns null for empty payload', () => {
    const { container } = render(<ChartTooltip active={true} payload={[]} />);
    expect(container.querySelector('span, p, div:not(#root)')).toBeNull();
  });

  it('renders a single value without series name', () => {
    render(
      <ChartTooltip
        active={true}
        payload={[{ name: 'Velocity', value: 42, color: '#228be6' }]}
      />
    );
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText('Velocity')).not.toBeInTheDocument();
  });

  it('renders multiple entries with series names', () => {
    render(
      <ChartTooltip
        active={true}
        payload={[
          { name: 'Completed', value: 40, color: '#228be6' },
          { name: 'Forecasted', value: 48, color: '#adb5bd' },
        ]}
      />
    );
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Forecasted')).toBeInTheDocument();
  });

  it('deduplicates entries with the same value', () => {
    render(
      <ChartTooltip
        active={true}
        payload={[
          { name: 'Series A', value: 42 },
          { name: 'Series B', value: 42 },
        ]}
      />
    );
    const valueElements = screen.getAllByText('42');
    expect(valueElements).toHaveLength(1);
  });

  it('filters out null/undefined values from mixed payloads', () => {
    render(
      <ChartTooltip
        active={true}
        payload={[
          { name: 'A', value: 10 },
          { name: 'B', value: null },
          { name: 'C', value: 20 },
        ]}
      />
    );
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('formats decimal values to one decimal place', () => {
    render(
      <ChartTooltip
        active={true}
        payload={[{ name: 'Rate', value: 3.14159, color: '#228be6' }]}
      />
    );
    expect(screen.getByText('3.1')).toBeInTheDocument();
  });

  it('uses custom formatValue when provided', () => {
    render(
      <ChartTooltip
        active={true}
        payload={[{ name: 'Speed', value: 100 }]}
        formatValue={(v) => `${v} km/h`}
      />
    );
    expect(screen.getByText('100 km/h')).toBeInTheDocument();
  });

  describe('dark mode styling', () => {
    beforeEach(() => {
      (useChartTheme as jest.Mock).mockReturnValue({
        ...mockTheme,
        isDark: true,
        tooltipBackground: 'var(--mantine-color-dark-6)',
        tooltipText: 'var(--mantine-color-gray-1)',
        tooltipBorder: 'var(--mantine-color-dark-4)',
      });
    });

    afterEach(() => {
      (useChartTheme as jest.Mock).mockReturnValue(mockTheme);
    });

    it('applies dark mode tooltip background', () => {
      const { container } = render(
        <ChartTooltip
          active={true}
          payload={[{ name: 'X', value: 10, color: '#fff' }]}
        />
      );
      const el = container.querySelector('[style*="background"]') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.style.background).toContain('var(--mantine-color-dark-6)');
    });

    it('applies border in dark mode', () => {
      const { container } = render(
        <ChartTooltip
          active={true}
          payload={[{ name: 'X', value: 10, color: '#fff' }]}
        />
      );
      const el = container.querySelector('[style*="border"]') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.style.border).toContain('var(--mantine-color-dark-4)');
    });
  });
});
