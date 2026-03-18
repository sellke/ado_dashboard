'use client';

import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { XAxisProps, YAxisProps, TooltipProps } from 'recharts';
import { ChartContainer } from './ChartContainer';
import { ChartTooltip } from './ChartTooltip';
import { useChartTheme } from './theme';
import type { ChartSeries } from './types';

export interface AppLineChartProps<T = Record<string, unknown>> {
  data: T[];
  dataKey: string;
  series: ChartSeries[];
  height?: number;
  withDots?: boolean;
  connectNulls?: boolean;
  curveType?: 'linear' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
  referenceLines?: Array<{ y?: number; x?: string | number; color?: string; label?: string }>;
  xAxisProps?: Partial<XAxisProps>;
  yAxisProps?: Partial<YAxisProps>;
  tooltipProps?: Partial<TooltipProps<number, string>>;
  children?: React.ReactNode;
}

export function AppLineChart<T = Record<string, unknown>>({
  data,
  dataKey,
  series,
  height = 200,
  withDots = false,
  connectNulls = false,
  curveType = 'linear',
  referenceLines,
  xAxisProps,
  yAxisProps,
  tooltipProps,
  children,
}: AppLineChartProps<T>) {
  const theme = useChartTheme();

  const hasCustomTooltip = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === Tooltip
  );

  return (
    <ChartContainer height={height}>
      <RechartsLineChart data={data as Record<string, unknown>[]}>
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
          <Line
            key={s.name}
            type={curveType}
            dataKey={s.name}
            name={s.label ?? s.name}
            stroke={theme.resolveColor(s.color)}
            strokeWidth={2}
            strokeDasharray={s.strokeDasharray}
            dot={withDots ? { r: 3, fill: theme.resolveColor(s.color) } : false}
            connectNulls={connectNulls}
            activeDot={withDots ? { r: 5 } : undefined}
          />
        ))}
        {referenceLines?.map((ref, i) => (
          <ReferenceLine
            key={`ref-${i}`}
            {...(ref.y != null ? { y: ref.y } : {})}
            {...(ref.x != null ? { x: ref.x } : {})}
            stroke={ref.color ? theme.resolveColor(ref.color) : theme.gridStroke}
            strokeDasharray="4 4"
            label={
              ref.label
                ? { value: ref.label, fill: theme.axisTickFill, fontSize: 11, position: 'insideTopRight' as const }
                : undefined
            }
          />
        ))}
        {children}
      </RechartsLineChart>
    </ChartContainer>
  );
}
