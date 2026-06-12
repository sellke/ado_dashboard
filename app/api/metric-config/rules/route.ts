import { NextResponse } from 'next/server';
import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { validateRuleConfigs } from '@/lib/metrics/config-validation';
import type { MetricRuleConfigInput } from '@/lib/metrics/types';
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
    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    await prisma.$transaction(
      rules.map((rule) =>
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
      )
    );

    const config = await loadMetricConfig(prisma);
    return NextResponse.json({ rules: config.rules });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
