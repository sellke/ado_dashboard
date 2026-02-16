/**
 * Tests for RagBadge component.
 * Verifies Green/Amber/Red rendering with Mantine theme colors and null handling.
 */
import { RagBadge } from '@/components/Dashboard/RagBadge';
import { render, screen } from '@/test-utils';

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
});
