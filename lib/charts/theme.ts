'use client';

import { useMantineTheme, useComputedColorScheme } from '@mantine/core';
import type { MantineTheme } from '@mantine/core';
import type { ChartTheme } from './types';

/**
 * Resolves a Mantine color token (e.g. 'blue.6') to an actual color value
 * using the theme's color palette. Falls back to CSS variables when the
 * token can't be resolved from the theme object directly.
 */
export function resolveColorToken(
  token: string,
  colors: MantineTheme['colors']
): string {
  if (
    token.startsWith('#') ||
    token.startsWith('rgb') ||
    token.startsWith('hsl') ||
    token === 'transparent'
  ) {
    return token;
  }

  if (token.includes('.')) {
    const [colorName, shade] = token.split('.');
    const shadeIndex = parseInt(shade, 10);
    if (colors[colorName] && !isNaN(shadeIndex) && colors[colorName][shadeIndex]) {
      return colors[colorName][shadeIndex];
    }
    return `var(--mantine-color-${colorName}-${shade})`;
  }

  if (colors[token]?.[6]) {
    return colors[token][6];
  }

  return `var(--mantine-color-${token})`;
}

export function useChartTheme(): ChartTheme {
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme('light');
  const isDark = colorScheme === 'dark';

  function resolveColor(token: string): string {
    return resolveColorToken(token, theme.colors);
  }

  return {
    resolveColor,
    axisTickFill: isDark ? '#adb5bd' : '#868e96',
    gridStroke: isDark ? '#373a40' : '#e9ecef',
    tooltipBackground: isDark
      ? 'var(--mantine-color-dark-6)'
      : 'rgba(255,255,255,0.95)',
    tooltipText: isDark
      ? 'var(--mantine-color-gray-1)'
      : 'var(--mantine-color-dark-7)',
    tooltipBorder: isDark
      ? 'var(--mantine-color-dark-4)'
      : 'var(--mantine-color-gray-2)',
    chartBackground: 'transparent',
    isDark,
  };
}
