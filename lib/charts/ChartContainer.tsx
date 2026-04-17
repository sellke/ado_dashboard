'use client';

import React from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartContainerProps {
  height: number;
  children: React.ReactElement;
  minWidth?: number;
  /**
   * Explicit numeric width in px. When provided:
   * - Dashboard: ResponsiveContainer uses the number and skips ResizeObserver.
   * - PPTX export: we skip ResponsiveContainer entirely and pass `width`/`height`
   *   straight to the Recharts chart so the first paint includes an `<svg>`
   *   (ResponsiveContainer can leave the subtree empty for one frame in hidden
   *   hosts, which breaks capture #1 — usually the line chart on the summary slide).
   * When omitted, falls back to `"100%"` (dashboard behavior).
   */
  width?: number;
}

/**
 * Wraps Recharts ResponsiveContainer with overflow: visible handling,
 * replacing the global CSS hack that targeted .mantine-LineChart-root
 * and .mantine-BarChart-root selectors.
 */
export function ChartContainer({ height, children, minWidth, width }: ChartContainerProps) {
  const fixedWidth = typeof width === 'number' && Number.isFinite(width) && width > 0;

  const wrapperStyle: React.CSSProperties = {
    width: fixedWidth ? width : width ?? '100%',
    height,
    overflow: 'visible',
    position: 'relative',
    minWidth,
  };

  if (fixedWidth) {
    return (
      <div className="chart-container" style={wrapperStyle}>
        {React.cloneElement(children, { width, height } as never)}
      </div>
    );
  }

  return (
    <div className="chart-container" style={wrapperStyle}>
      <ResponsiveContainer width={width ?? '100%'} height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
