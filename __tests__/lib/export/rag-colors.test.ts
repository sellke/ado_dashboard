import { RAG_COLORS, ragColor } from '@/lib/export/rag-colors';

describe('ragColor', () => {
  it('returns MDT green hex for "Green"', () => {
    expect(ragColor('Green')).toBe('2E7D4F');
  });

  it('returns MDT amber hex for "Amber"', () => {
    expect(ragColor('Amber')).toBe('D19E00');
  });

  it('returns MDT red hex for "Red"', () => {
    expect(ragColor('Red')).toBe('B3261E');
  });

  it('returns body-muted hex for null', () => {
    expect(ragColor(null)).toBe('5A5A5A');
  });

  it('returns body-muted hex for unknown string', () => {
    expect(ragColor('Unknown')).toBe('5A5A5A');
  });

  it('returned colors do not include a leading #', () => {
    for (const color of Object.values(RAG_COLORS)) {
      expect(color).not.toMatch(/^#/);
    }
  });
});
