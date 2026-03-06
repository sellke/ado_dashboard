import { renderHook } from '@testing-library/react';
import { resolveColorToken, useChartTheme } from '@/lib/charts/theme';

jest.mock('@mantine/core', () => ({
  useMantineTheme: jest.fn(),
  useComputedColorScheme: jest.fn(),
}));

import { useMantineTheme, useComputedColorScheme } from '@mantine/core';

const MOCK_COLORS: Record<string, string[]> = {
  blue: [
    '#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7',
    '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab',
  ],
  gray: [
    '#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da',
    '#adb5bd', '#868e96', '#495057', '#343a40', '#212529',
  ],
  red: [
    '#fff5f5', '#ffe3e3', '#ffc9c9', '#ffa8a8', '#ff8787',
    '#ff6b6b', '#fa5252', '#f03e3e', '#e03131', '#c92a2a',
  ],
  teal: [
    '#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9',
    '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b',
  ],
};

const mockTheme = { colors: MOCK_COLORS };

describe('resolveColorToken', () => {
  it('resolves dotted tokens like "blue.6" to hex from theme', () => {
    expect(resolveColorToken('blue.6', MOCK_COLORS as never)).toBe('#228be6');
  });

  it('resolves "gray.5" to hex', () => {
    expect(resolveColorToken('gray.5', MOCK_COLORS as never)).toBe('#adb5bd');
  });

  it('resolves "red.4" to hex', () => {
    expect(resolveColorToken('red.4', MOCK_COLORS as never)).toBe('#ff8787');
  });

  it('passes through CSS hex values unchanged', () => {
    expect(resolveColorToken('#ff0000', MOCK_COLORS as never)).toBe('#ff0000');
  });

  it('passes through rgb() values unchanged', () => {
    expect(resolveColorToken('rgb(255,0,0)', MOCK_COLORS as never)).toBe('rgb(255,0,0)');
  });

  it('passes through hsl() values unchanged', () => {
    expect(resolveColorToken('hsl(0,100%,50%)', MOCK_COLORS as never)).toBe('hsl(0,100%,50%)');
  });

  it('passes through "transparent" unchanged', () => {
    expect(resolveColorToken('transparent', MOCK_COLORS as never)).toBe('transparent');
  });

  it('falls back to CSS variable for unknown dotted token', () => {
    expect(resolveColorToken('indigo.7', MOCK_COLORS as never)).toBe(
      'var(--mantine-color-indigo-7)'
    );
  });

  it('resolves bare color name to shade 6', () => {
    expect(resolveColorToken('blue', MOCK_COLORS as never)).toBe('#228be6');
  });

  it('falls back to CSS variable for unknown bare color name', () => {
    expect(resolveColorToken('indigo', MOCK_COLORS as never)).toBe(
      'var(--mantine-color-indigo)'
    );
  });
});

describe('useChartTheme', () => {
  beforeEach(() => {
    (useMantineTheme as jest.Mock).mockReturnValue(mockTheme);
  });

  describe('light mode', () => {
    beforeEach(() => {
      (useComputedColorScheme as jest.Mock).mockReturnValue('light');
    });

    it('resolves color tokens via theme', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.resolveColor('blue.6')).toBe('#228be6');
    });

    it('returns isDark = false', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.isDark).toBe(false);
    });

    it('returns light-mode axis tick fill', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.axisTickFill).toBe('#868e96');
    });

    it('returns light-mode grid stroke', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.gridStroke).toBe('#e9ecef');
    });

    it('returns light-mode tooltip background', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.tooltipBackground).toBe('rgba(255,255,255,0.95)');
    });

    it('returns transparent chart background', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.chartBackground).toBe('transparent');
    });
  });

  describe('dark mode', () => {
    beforeEach(() => {
      (useComputedColorScheme as jest.Mock).mockReturnValue('dark');
    });

    it('returns isDark = true', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.isDark).toBe(true);
    });

    it('returns dark-mode axis tick fill', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.axisTickFill).toBe('#adb5bd');
    });

    it('returns dark-mode grid stroke', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.gridStroke).toBe('#373a40');
    });

    it('returns dark-mode tooltip background', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.tooltipBackground).toBe('var(--mantine-color-dark-6)');
    });

    it('returns dark-mode tooltip text', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.tooltipText).toBe('var(--mantine-color-gray-1)');
    });

    it('returns dark-mode tooltip border', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.tooltipBorder).toBe('var(--mantine-color-dark-4)');
    });

    it('still resolves color tokens in dark mode', () => {
      const { result } = renderHook(() => useChartTheme());
      expect(result.current.resolveColor('teal.6')).toBe('#12b886');
    });
  });
});
