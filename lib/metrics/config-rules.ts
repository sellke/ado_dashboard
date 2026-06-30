import {
  DEFAULT_DELIVERY_EXCLUDED_TYPES,
  DEFAULT_OVERHEAD_INCLUDED_TYPES,
  type MetricCategory,
  type MetricEngineConfigInput,
  type MetricRuleConfigInput,
} from './types';

export function isAdpMetricsIncluded(engine: { includeAdpMetrics?: boolean }): boolean {
  return engine.includeAdpMetrics !== false;
}

export function getDefaultInclusion(category: MetricCategory, workItemType: string): boolean {
  if (category === 'deliveryPoints') {
    return !(DEFAULT_DELIVERY_EXCLUDED_TYPES as readonly string[]).includes(workItemType);
  }
  return (DEFAULT_OVERHEAD_INCLUDED_TYPES as readonly string[]).includes(workItemType);
}

export function isIncluded(
  rules: MetricRuleConfigInput[],
  category: MetricCategory,
  workItemType: string
): boolean {
  return (
    rules.find((rule) => rule.category === category && rule.workItemType === workItemType)
      ?.included ?? getDefaultInclusion(category, workItemType)
  );
}
