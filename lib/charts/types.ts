export interface ChartSeries {
  name: string;
  /** Mantine color token (e.g. 'blue.6') or CSS color value */
  color: string;
  label?: string;
  strokeDasharray?: string;
}

export interface ChartTheme {
  resolveColor(token: string): string;
  axisTickFill: string;
  gridStroke: string;
  tooltipBackground: string;
  tooltipText: string;
  tooltipBorder: string;
  chartBackground: string;
  isDark: boolean;
}
