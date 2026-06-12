import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  CONFIGURABLE_WORK_ITEM_TYPES,
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRIC_RULE_CONFIGS,
  DEFAULT_THRESHOLD_CONFIGS,
  type MetricEngineConfigInput,
  type MetricRuleConfigInput,
  type ThresholdConfigInput,
} from './types';

export interface MetricConfigInput {
  thresholds: ThresholdConfigInput[];
  engine: MetricEngineConfigInput;
  rules: MetricRuleConfigInput[];
}

function mergeRuleDefaults(rows: MetricRuleConfigInput[]): MetricRuleConfigInput[] {
  const byKey = new Map(rows.map((rule) => [`${rule.category}:${rule.workItemType}`, rule]));

  return DEFAULT_METRIC_RULE_CONFIGS.map((defaultRule) => {
    const key = `${defaultRule.category}:${defaultRule.workItemType}`;
    return byKey.get(key) ?? defaultRule;
  }).concat(
    rows.filter(
      (row) =>
        !CONFIGURABLE_WORK_ITEM_TYPES.includes(
          row.workItemType as (typeof CONFIGURABLE_WORK_ITEM_TYPES)[number]
        )
    )
  );
}

function mergeThresholdDefaults(rows: ThresholdConfigInput[]): ThresholdConfigInput[] {
  const byMetricName = new Map(rows.map((threshold) => [threshold.metricName, threshold]));

  return DEFAULT_THRESHOLD_CONFIGS.map(
    (defaultThreshold) => byMetricName.get(defaultThreshold.metricName) ?? defaultThreshold
  ).concat(
    rows.filter((row) => !DEFAULT_THRESHOLD_CONFIGS.some((t) => t.metricName === row.metricName))
  );
}

export async function loadMetricConfig(db: PrismaClient = prisma): Promise<MetricConfigInput> {
  const [thresholdRows, engineRow, ruleRows] = await Promise.all([
    db.thresholdConfig.findMany(),
    db.metricEngineConfig.findUnique({ where: { key: 'default' } }),
    db.metricRuleConfig.findMany(),
  ]);

  return {
    thresholds: mergeThresholdDefaults(
      thresholdRows.map((threshold) => ({
        metricName: threshold.metricName,
        greenMin: threshold.greenMin,
        greenMax: threshold.greenMax,
        amberMin: threshold.amberMin,
        amberMax: threshold.amberMax,
      }))
    ),
    engine: {
      velocityGreenFloor: engineRow?.velocityGreenFloor ?? DEFAULT_ENGINE_CONFIG.velocityGreenFloor,
      velocityAmberFloor: engineRow?.velocityAmberFloor ?? DEFAULT_ENGINE_CONFIG.velocityAmberFloor,
      rollingWindow: engineRow?.rollingWindow ?? DEFAULT_ENGINE_CONFIG.rollingWindow,
    },
    rules: mergeRuleDefaults(
      ruleRows.map((rule) => ({
        category: rule.category,
        workItemType: rule.workItemType,
        included: rule.included,
      }))
    ),
  };
}
