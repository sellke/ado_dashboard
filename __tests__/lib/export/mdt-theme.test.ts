import { mdtContentTop, truncateForFooter } from '@/lib/export/mdt-theme';

describe('mdt-theme helpers', () => {
  it('mdtContentTop uses tighter band without subtitle', () => {
    expect(mdtContentTop(false)).toBeLessThan(mdtContentTop(true));
  });

  it('truncateForFooter leaves short strings unchanged', () => {
    expect(truncateForFooter('Hello', 20)).toBe('Hello');
  });

  it('truncateForFooter adds ellipsis when over max', () => {
    expect(truncateForFooter('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abcdefghi…');
  });
});
