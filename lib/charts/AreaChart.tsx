'use client';

import React from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { XAxisProps, YAxisProps, TooltipProps } from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './theme';
import type { ChartSeries } from './types';

export interface AppAreaChartProps<T = Record<string, unknown>> {
  data: T[];
  dataKey: string;
  series: ChartSeries[];
  height?: number;
  curveType?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  tooltipProps?: Partial<TooltipProps<number, string>>;
  children?: React.ReactNode;
}

export function AppAreaChart<T = Record<string, unknown>>({
  data,
  dataKey,
  series,
  height = 200,
  curveType = 'linear',
  xAxisProps,
  yAxisProps,
  tooltipProps,
  children,
}: AppAreaChartProps<T>) {
  const theme = useChartTheme();

  const hasCustomTooltip = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === Tooltip
  );

  return (
    <ChartContainer height={height}>
      <RechartsAreaChart data={data as Record<string, unknown>[]}>
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
            {...tooltipProps}
          />
        )}
        {series.map((s) => (
          <Area
            key={s.name}
            type={curveType}
            dataKey={s.name}
            name={s.label ?? s.name}
            stroke={theme.resolveColor(s.color)}
            fill={theme.resolveColor(s.color)}
            fillOpacity={0.3}
            strokeWidth={2}
            strokeDasharray={s.strokeDasharray}
          />
        ))}
        {children}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
