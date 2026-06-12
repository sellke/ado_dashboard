import { NextResponse } from 'next/server';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { DASHBOARD_THRESHOLD_METRICS, validateThresholds } from '@/lib/metrics/config-validation';
import type { ThresholdConfigInput } from '@/lib/metrics/types';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { errors: [{ field: 'body', message: 'Request body must be an object' }] },
        { status: 422 }
      );
    }
    const thresholds = Array.isArray(body.thresholds)
      ? (body.thresholds as ThresholdConfigInput[])
      : [];
    const errors = validateThresholds(thresholds);

    if (!Array.isArray(body.thresholds)) {
      errors.push({ field: 'thresholds', message: 'Thresholds must be an array' });
    }
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    await prisma.$transaction(
      thresholds.map((threshold) =>
        prisma.thresholdConfig.upsert({
          where: { metricName: threshold.metricName },
          update: {
            greenMin: threshold.greenMin,
            greenMax: threshold.greenMax,
            amberMin: threshold.amberMin,
            amberMax: threshold.amberMax,
          },
          create: {
            metricName: threshold.metricName,
            greenMin: threshold.greenMin,
            greenMax: threshold.greenMax,
            amberMin: threshold.amberMin,
            amberMax: threshold.amberMax,
          },
        })
      )
    );

    const config = await loadMetricConfig(prisma);
    return NextResponse.json({
      thresholds: config.thresholds.filter((threshold) =>
        DASHBOARD_THRESHOLD_METRICS.includes(threshold.metricName as any)
      ),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
