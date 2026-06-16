import { loadMetricConfig } from '@/lib/metrics/config-loader';
import { DEFAULT_ENGINE_CONFIG } from '@/lib/metrics/types';

describe('loadMetricConfig', () => {
  it('loads persisted config and fills missing rule rows from defaults', async () => {
    const db = {
      thresholdConfig: {
        findMany: jest.fn().mockResolvedValue([
          {
            metricName: 'overheadPercent',
            greenMin: 0,
            greenMax: 30,
            amberMin: 30.01,
            amberMax: 45,
          },
        ]),
      },
      metricEngineConfig: {
        findUnique: jest.fn().mockResolvedValue({
          velocityGreenFloor: 1.2,
          velocityAmberFloor: 0.8,
          rollingWindow: 2,
          cycleTimeRollingWindow: 3,
        }),
      },
      metricRuleConfig: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ category: 'deliveryPoints', workItemType: 'Bug', included: true }]),
      },
    };

    const config = await loadMetricConfig(db as any);

    expect(config.thresholds).toEqual([
      {
        metricName: 'sprintPredictability',
        greenMin: 80,
        greenMax: 100,
        amberMin: 60,
        amberMax: 79.99,
      },
      {
        metricName: 'carryOverRate',
        greenMin: 0,
        greenMax: 10,
        amberMin: 10.01,
        amberMax: 25,
      },
      {
        metricName: 'overheadPercent',
        greenMin: 0,
        greenMax: 30,
        amberMin: 30.01,
        amberMax: 45,
      },
      expect.objectContaining({ metricName: 'deliveryToBugRatio' }),
      expect.objectContaining({ metricName: 'agingWipDays' }),
      expect.objectContaining({ metricName: 'scopeCreepIndex' }),
      expect.objectContaining({ metricName: 'milestoneMonthly' }),
      expect.objectContaining({ metricName: 'milestoneQuarterly' }),
    ]);
    expect(config.engine).toEqual({
      velocityGreenFloor: 1.2,
      velocityAmberFloor: 0.8,
      rollingWindow: 2,
      cycleTimeRollingWindow: 3,
    });
    expect(config.rules).toEqual(
      expect.arrayContaining([
        { category: 'deliveryPoints', workItemType: 'Bug', included: true },
        { category: 'deliveryPoints', workItemType: 'Spike', included: false },
        { category: 'overheadHours', workItemType: 'Support', included: true },
      ])
    );
  });

  it('uses engine defaults when the singleton row is missing', async () => {
    const db = {
      thresholdConfig: { findMany: jest.fn().mockResolvedValue([]) },
      metricEngineConfig: { findUnique: jest.fn().mockResolvedValue(null) },
      metricRuleConfig: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const config = await loadMetricConfig(db as any);

    expect(config.engine).toEqual(DEFAULT_ENGINE_CONFIG);
    expect(config.thresholds).toEqual(
      expect.arrayContaining([
        {
          metricName: 'overheadPercent',
          greenMin: 0,
          greenMax: 30,
          amberMin: 30.01,
          amberMax: 45,
        },
      ])
    );
    expect(config.rules).toEqual(
      expect.arrayContaining([
        { category: 'deliveryPoints', workItemType: 'Bug', included: false },
        { category: 'deliveryPoints', workItemType: 'UserStory', included: true },
      ])
    );
  });
});
