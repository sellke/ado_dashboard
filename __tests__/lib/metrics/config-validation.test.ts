import {
  validateEngineConfig,
  validateRuleConfigs,
  validateThresholds,
} from '@/lib/metrics/config-validation';

describe('metric config validation', () => {
  it('accepts valid dashboard threshold ranges', () => {
    expect(
      validateThresholds([
        {
          metricName: 'deliveryToBugRatio',
          greenMin: 0,
          greenMax: 0.25,
          amberMin: 0.26,
          amberMax: 0.5,
        },
      ])
    ).toEqual([]);
  });

  it('rejects invalid threshold ranges and direction', () => {
    const errors = validateThresholds([
      {
        metricName: 'deliveryToBugRatio',
        greenMin: 0.1,
        greenMax: 1,
        amberMin: 0.26,
        amberMax: 0.4,
      },
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'thresholds.0.greenMin' }),
        expect.objectContaining({ field: 'thresholds.0.amberMin' }),
      ])
    );
  });

  it('rejects threshold gaps larger than the seeded precision step', () => {
    const errors = validateThresholds([
      {
        metricName: 'overheadPercent',
        greenMin: 0,
        greenMax: 20,
        amberMin: 30,
        amberMax: 40,
      },
    ]);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'thresholds.0.amberMin',
          message: expect.stringMatching(/gap/i),
        }),
      ])
    );
  });

  it('validates engine cutoffs and rolling window', () => {
    expect(
      validateEngineConfig({
        velocityGreenFloor: 1,
        velocityAmberFloor: 0.7,
        rollingWindow: 4,
        cycleTimeRollingWindow: 4,
      })
    ).toEqual([]);

    expect(
      validateEngineConfig({
        velocityGreenFloor: 0.7,
        velocityAmberFloor: 1,
        rollingWindow: 0,
        cycleTimeRollingWindow: 0,
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'velocityAmberFloor' }),
        expect.objectContaining({ field: 'rollingWindow' }),
        expect.objectContaining({ field: 'cycleTimeRollingWindow' }),
      ])
    );
  });

  it('validates rules while allowing all rows to be excluded', () => {
    expect(
      validateRuleConfigs([{ category: 'deliveryPoints', workItemType: 'Bug', included: false }])
    ).toEqual([]);

    expect(
      validateRuleConfigs([
        { category: 'bad' as any, workItemType: 'Unknown', included: 'yes' as any },
      ])
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'rules.0.category' }),
        expect.objectContaining({ field: 'rules.0.workItemType' }),
        expect.objectContaining({ field: 'rules.0.included' }),
      ])
    );
  });
});
