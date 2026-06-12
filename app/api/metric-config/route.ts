import { NextResponse } from 'next/server';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { DASHBOARD_THRESHOLD_METRICS } from '@/lib/metrics/config-validation';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const config = await loadMetricConfig(prisma);
    return NextResponse.json({
      thresholds: config.thresholds.filter((threshold) =>
        DASHBOARD_THRESHOLD_METRICS.includes(threshold.metricName as any)
      ),
      engine: config.engine,
      rules: config.rules,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
