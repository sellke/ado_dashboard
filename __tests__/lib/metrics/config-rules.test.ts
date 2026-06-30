import { getDefaultInclusion, isAdpMetricsIncluded, isIncluded } from '@/lib/metrics/config-rules';
import type { MetricRuleConfigInput } from '@/lib/metrics/types';

describe('metric config rules', () => {
  it('defaults delivery points to current behavior', () => {
    expect(getDefaultInclusion('deliveryPoints', 'Bug')).toBe(false);
    expect(getDefaultInclusion('deliveryPoints', 'Spike')).toBe(false);
    expect(getDefaultInclusion('deliveryPoints', 'Support')).toBe(true);
    expect(getDefaultInclusion('deliveryPoints', 'Epic')).toBe(true);
    expect(getDefaultInclusion('deliveryPoints', 'UserStory')).toBe(true);
  });

  it('defaults overhead hours to current overhead-routed types', () => {
    expect(getDefaultInclusion('overheadHours', 'Bug')).toBe(true);
    expect(getDefaultInclusion('overheadHours', 'Spike')).toBe(true);
    expect(getDefaultInclusion('overheadHours', 'Support')).toBe(true);
    expect(getDefaultInclusion('overheadHours', 'UserStory')).toBe(false);
  });

  it('uses explicit rule rows over defaults', () => {
    const rules: MetricRuleConfigInput[] = [
      { category: 'deliveryPoints', workItemType: 'Bug', included: true },
      { category: 'overheadHours', workItemType: 'Support', included: false },
    ];

    expect(isIncluded(rules, 'deliveryPoints', 'Bug')).toBe(true);
    expect(isIncluded(rules, 'overheadHours', 'Support')).toBe(false);
    expect(isIncluded(rules, 'deliveryPoints', 'Spike')).toBe(false);
  });

  it('treats missing includeAdpMetrics as included', () => {
    expect(isAdpMetricsIncluded({} as { includeAdpMetrics: boolean })).toBe(true);
    expect(isAdpMetricsIncluded({ includeAdpMetrics: true })).toBe(true);
    expect(isAdpMetricsIncluded({ includeAdpMetrics: false })).toBe(false);
  });
});
