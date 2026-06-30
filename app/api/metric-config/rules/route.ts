import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { validateRuleConfigs } from '@/lib/metrics/config-validation';
import {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRIC_ENGINE_CONFIG_KEY,
  type MetricRuleConfigInput,
} from '@/lib/metrics/types';
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
    const rules = Array.isArray(body.rules) ? (body.rules as MetricRuleConfigInput[]) : [];
    const errors = validateRuleConfigs(rules);

    if (!Array.isArray(body.rules)) {
      errors.push({ field: 'rules', message: 'Rules must be an array' });
    }
    if ('includeAdpMetrics' in body && typeof body.includeAdpMetrics !== 'boolean') {
      errors.push({
        field: 'includeAdpMetrics',
        message: 'includeAdpMetrics must be a boolean',
      });
    }
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const operations: Prisma.PrismaPromise<unknown>[] = rules.map((rule) =>
      prisma.metricRuleConfig.upsert({
        where: {
          category_workItemType: {
            category: rule.category,
            workItemType: rule.workItemType,
          },
        },
        update: { included: rule.included },
        create: rule,
      })
    );

    if ('includeAdpMetrics' in body) {
      operations.push(
        prisma.metricEngineConfig.upsert({
          where: { key: DEFAULT_METRIC_ENGINE_CONFIG_KEY },
          update: { includeAdpMetrics: body.includeAdpMetrics },
          create: {
            key: DEFAULT_METRIC_ENGINE_CONFIG_KEY,
            ...DEFAULT_ENGINE_CONFIG,
            includeAdpMetrics: body.includeAdpMetrics,
          },
        })
      );
    }

    await prisma.$transaction(operations);

    const config = await loadMetricConfig(prisma);
    return NextResponse.json({
      rules: config.rules,
      includeAdpMetrics: config.engine.includeAdpMetrics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
