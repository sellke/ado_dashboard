import { ragColor, RAG_COLORS } from '@/lib/export/rag-colors';

describe('ragColor', () => {
  it('returns green hex for "Green"', () => {
    expect(ragColor('Green')).toBe('2f9e44');
  });

  it('returns amber hex for "Amber"', () => {
    expect(ragColor('Amber')).toBe('e67700');
  });

  it('returns red hex for "Red"', () => {
    expect(ragColor('Red')).toBe('c92a2a');
  });

  it('returns grey hex for null', () => {
    expect(ragColor(null)).toBe('868e96');
  });

  it('returns grey hex for unknown string', () => {
    expect(ragColor('Unknown')).toBe('868e96');
  });

  it('returned colors do not include a leading #', () => {
    for (const color of Object.values(RAG_COLORS)) {
      expect(color).not.toMatch(/^#/);
    }
  });
});
