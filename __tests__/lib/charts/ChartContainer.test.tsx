import { render } from '@testing-library/react';
import { ChartContainer } from '@/lib/charts/ChartContainer';

jest.mock('recharts', () => ({
  ResponsiveContainer: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    width: string | number;
    height: number;
  }) => (
    <div data-testid="responsive-container" data-width={props.width} data-height={props.height}>
      {children}
    </div>
  ),
}));

describe('ChartContainer', () => {
  it('renders children within a ResponsiveContainer', () => {
    const { getByTestId } = render(
      <ChartContainer height={200}>
        <div data-testid="chart-child" />
      </ChartContainer>
    );
    expect(getByTestId('responsive-container')).toBeInTheDocument();
    expect(getByTestId('chart-child')).toBeInTheDocument();
  });

  it('sets overflow: visible on the wrapper div', () => {
    const { container } = render(
      <ChartContainer height={200}>
        <div />
      </ChartContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.overflow).toBe('visible');
  });

  it('applies the specified height', () => {
    const { container } = render(
      <ChartContainer height={300}>
        <div />
      </ChartContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('300px');
  });

  it('sets width to 100%', () => {
    const { container } = render(
      <ChartContainer height={200}>
        <div />
      </ChartContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('100%');
  });

  it('sets position: relative for layout context', () => {
    const { container } = render(
      <ChartContainer height={200}>
        <div />
      </ChartContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.position).toBe('relative');
  });

  it('applies minWidth when provided', () => {
    const { container } = render(
      <ChartContainer height={200} minWidth={400}>
        <div />
      </ChartContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.minWidth).toBe('400px');
  });

  it('passes height to ResponsiveContainer', () => {
    const { getByTestId } = render(
      <ChartContainer height={250}>
        <div />
      </ChartContainer>
    );
    expect(getByTestId('responsive-container')).toHaveAttribute('data-height', '250');
  });

  it('with fixed pixel width, skips ResponsiveContainer and passes width/height to the chart', () => {
    const ChartStub = (props: { width?: number; height?: number }) => (
      <div data-testid="chart-stub" data-width={props.width} data-height={props.height} />
    );
    const { queryByTestId, getByTestId } = render(
      <ChartContainer height={370} width={620}>
        <ChartStub />
      </ChartContainer>
    );
    expect(queryByTestId('responsive-container')).not.toBeInTheDocument();
    expect(getByTestId('chart-stub')).toHaveAttribute('data-width', '620');
    expect(getByTestId('chart-stub')).toHaveAttribute('data-height', '370');
  });

  it('has the chart-container className', () => {
    const { container } = render(
      <ChartContainer height={200}>
        <div />
      </ChartContainer>
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toBe('chart-container');
  });
});
