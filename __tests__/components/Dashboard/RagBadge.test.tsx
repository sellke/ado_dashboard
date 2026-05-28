/**
 * Tests for RagBadge component.
 * Verifies Green/Amber/Red rendering with Mantine theme colors, null handling,
 * and optional RAG explanation tooltip behavior.
 */
import { RagBadge } from '@/components/Dashboard/RagBadge';
import { render, screen, userEvent } from '@/test-utils';

describe('RagBadge', () => {
  it('renders Green status with green color and G label', () => {
    render(<RagBadge rag="Green" />);
    const badge = screen.getByText('G');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[class*="mantine-Badge"]')).toBeInTheDocument();
  });

  it('renders Amber status with yellow color and A label', () => {
    render(<RagBadge rag="Amber" />);
    const badge = screen.getByText('A');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[class*="mantine-Badge"]')).toBeInTheDocument();
  });

  it('renders Red status with red color and R label', () => {
    render(<RagBadge rag="Red" />);
    const badge = screen.getByText('R');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[class*="mantine-Badge"]')).toBeInTheDocument();
  });

  it('renders nothing when rag is null', () => {
    render(<RagBadge rag={null} />);
    expect(screen.queryByText('G')).not.toBeInTheDocument();
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.queryByText('R')).not.toBeInTheDocument();
  });

  describe('RAG tooltip', () => {
    it('does not make the badge a focusable tooltip trigger when ragTooltip is omitted', () => {
      render(<RagBadge rag="Green" />);
      const root = screen.getByText('G').closest('[class*="mantine-Badge-root"]');
      expect(root).not.toHaveAttribute('tabindex');
      expect(root).not.toHaveAttribute('aria-label');
    });

    it('exposes a focusable badge with aria-label when ragTooltip is provided', () => {
      render(<RagBadge rag="Amber" ragTooltip="Green 0–30%, Amber 30.01–45%, Red above 45%." />);
      const root = screen.getByLabelText(/Amber status/);
      expect(root).toHaveAttribute('tabindex', '0');
      expect(root.getAttribute('aria-label')).toContain('30.01–45%');
    });

    it('shows the RAG explanation tooltip on hover', async () => {
      const user = userEvent.setup();
      render(<RagBadge rag="Red" ragTooltip="Green 0–10%, Amber 10.01–25%, Red above 25%." />);

      await user.hover(screen.getByText('R'));

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip.textContent).toContain('10.01–25%');
    });

    it('renders nothing when rag is null even if ragTooltip is set', () => {
      render(<RagBadge rag={null} ragTooltip="Some explanation" />);
      expect(screen.queryByText('G')).not.toBeInTheDocument();
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});
