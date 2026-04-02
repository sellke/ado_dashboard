'use client';

import React from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { XAxisProps, YAxisProps, TooltipProps } from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './theme';
import type { ChartSeries } from './types';

export interface AppBarChartProps<T = Record<string, unknown>> {
  data: T[];
  dataKey: string;
  series: ChartSeries[];
  height?: number;
  type?: 'default' | 'stacked';
  withLegend?: boolean;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  tooltipProps?: Partial<TooltipProps<number, string>>;
  legendProps?: Record<string, unknown>;
  children?: React.ReactNode;
}

export function AppBarChart<T = Record<string, unknown>>({
  data,
  dataKey,
  series,
  height = 200,
  type = 'default',
  withLegend = false,
  xAxisProps,
  yAxisProps,
  tooltipProps,
  legendProps,
  children,
}: AppBarChartProps<T>) {
  const theme = useChartTheme();

  const hasCustomTooltip = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === Tooltip
  );

  return (
    <ChartContainer height={height}>
      <RechartsBarChart data={data as Record<string, unknown>[]} margin={{ top: 5, right: 20, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} vertical={false} />
        <XAxis
          dataKey={dataKey}
          tick={{ fill: theme.axisTickFill, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          {...xAxisProps}
        />
        <YAxis
          tick={{ fill: theme.axisTickFill, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          {...yAxisProps}
        />
        {!hasCustomTooltip && (
          <Tooltip
            content={<ChartTooltip />}
            isAnimationActive={false}
            cursor={false}
            allowEscapeViewBox={{ x: true, y: true }}
            {...tooltipProps}
          />
        )}
        {withLegend && <Legend {...legendProps} />}
        {series.map((s) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            name={s.label ?? s.name}
            fill={theme.resolveColor(s.color)}
            stackId={type === 'stacked' ? 'stack' : undefined}
          />
        ))}
        {children}
      </RechartsBarChart>
    </ChartContainer>
  );
}
