/**
 * Tests for MetricDefinitionHint.
 * Verifies info-icon rendering, accessible label, hover/focus tooltip content,
 * and defensive null render for unknown metric IDs.
 */
import { MetricDefinitionHint } from '@/components/Dashboard/MetricDefinitionHint';
import type { MetricId } from '@/lib/metrics/definitions';
import { render, screen, userEvent } from '@/test-utils';

describe('MetricDefinitionHint', () => {
  it('renders an info icon with a descriptive aria-label', () => {
    render(<MetricDefinitionHint metricId="velocity" label="Avg Velocity" />);
    expect(
      screen.getByRole('button', { name: 'Definition for Avg Velocity' })
    ).toBeInTheDocument();
  });

  it('shows Definition and Calculation copy on hover', async () => {
    const user = userEvent.setup();
    render(<MetricDefinitionHint metricId="velocity" label="Avg Velocity" />);

    await user.hover(screen.getByRole('button', { name: 'Definition for Avg Velocity' }));

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('Definition:');
    expect(tooltip.textContent).toContain('Calculation:');
    expect(tooltip.textContent).toContain('Bugs and Spikes excluded');
  });

  it('reveals the tooltip on keyboard focus', async () => {
    const user = userEvent.setup();
    render(<MetricDefinitionHint metricId="overheadPercent" label="Overhead %" />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Definition for Overhead %' })).toHaveFocus();

    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip.textContent).toContain('non-delivery work');
  });

  it('renders nothing for an unknown metric ID', () => {
    render(<MetricDefinitionHint metricId={'bogus' as MetricId} label="Mystery" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
