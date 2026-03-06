'use client';

import { ResponsiveContainer } from 'recharts';

interface ChartContainerProps {
  height: number;
  children: React.ReactElement;
  minWidth?: number;
}

/**
 * Wraps Recharts ResponsiveContainer with overflow: visible handling,
 * replacing the global CSS hack that targeted .mantine-LineChart-root
 * and .mantine-BarChart-root selectors.
 */
export function ChartContainer({ height, children, minWidth }: ChartContainerProps) {
  return (
    <div
      className="chart-container"
      style={{
        width: '100%',
        height,
        overflow: 'visible',
        position: 'relative',
        minWidth,
      }}
    >
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
