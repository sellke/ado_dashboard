import { NextResponse } from 'next/server';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { validateEngineConfig } from '@/lib/metrics/config-validation';
import {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRIC_ENGINE_CONFIG_KEY,
  type MetricEngineConfigInput,
} from '@/lib/metrics/types';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Partial<MetricEngineConfigInput>;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { errors: [{ field: 'body', message: 'Request body must be an object' }] },
        { status: 422 }
      );
    }
    const engine = {
      velocityGreenFloor: body.velocityGreenFloor,
      velocityAmberFloor: body.velocityAmberFloor,
      rollingWindow: body.rollingWindow,
      cycleTimeRollingWindow:
        body.cycleTimeRollingWindow ?? DEFAULT_ENGINE_CONFIG.cycleTimeRollingWindow,
    };
    const errors = validateEngineConfig(engine);

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }
    const engineConfig = engine as MetricEngineConfigInput;

    await prisma.metricEngineConfig.upsert({
      where: { key: DEFAULT_METRIC_ENGINE_CONFIG_KEY },
      update: engineConfig,
      create: {
        key: DEFAULT_METRIC_ENGINE_CONFIG_KEY,
        ...engineConfig,
      },
    });

    const config = await loadMetricConfig(prisma);
    return NextResponse.json({ engine: config.engine });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
