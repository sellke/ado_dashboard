/**
 * @jest-environment node
 */

import { PUT as putEngine } from '@/app/api/metric-config/engine/route';
import { GET } from '@/app/api/metric-config/route';
import { PUT as putRules } from '@/app/api/metric-config/rules/route';
import { PUT as putThresholds } from '@/app/api/metric-config/thresholds/route';
import { DEFAULT_ENGINE_CONFIG, DEFAULT_METRIC_RULE_CONFIGS } from '@/lib/metrics/types';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    thresholdConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    metricEngineConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    metricRuleConfig: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const { prisma } = require('@/lib/prisma');

function jsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function rawJsonRequest(url: string, body: string): Request {
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('/api/metric-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.thresholdConfig.findMany.mockResolvedValue([
      {
        metricName: 'overheadPercent',
        greenMin: 0,
        greenMax: 30,
        amberMin: 30.01,
        amberMax: 45,
      },
      {
        metricName: 'carryOverRate',
        greenMin: 0,
        greenMax: 10,
        amberMin: 10.01,
        amberMax: 25,
      },
      {
        metricName: 'deliveryToBugRatio',
        greenMin: 0,
        greenMax: 0.25,
        amberMin: 0.26,
        amberMax: 0.5,
      },
    ]);
    prisma.metricEngineConfig.findUnique.mockResolvedValue(DEFAULT_ENGINE_CONFIG);
    prisma.metricRuleConfig.findMany.mockResolvedValue(DEFAULT_METRIC_RULE_CONFIGS);
    prisma.thresholdConfig.upsert.mockResolvedValue({});
    prisma.metricEngineConfig.upsert.mockResolvedValue({});
    prisma.metricRuleConfig.upsert.mockResolvedValue({});
  });

  it('GET returns thresholds, engine, and rules with default fallback', async () => {
    prisma.thresholdConfig.findMany.mockResolvedValue([]);
    prisma.metricEngineConfig.findUnique.mockResolvedValue(null);
    prisma.metricRuleConfig.findMany.mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(
      data.thresholds.map((threshold: { metricName: string }) => threshold.metricName).sort()
    ).toEqual(['carryOverRate', 'deliveryToBugRatio', 'overheadPercent']);
    expect(data.engine).toEqual(DEFAULT_ENGINE_CONFIG);
    expect(data.rules).toEqual(expect.arrayContaining(DEFAULT_METRIC_RULE_CONFIGS));
  });

  it('PUT thresholds rejects invalid ranges without persisting', async () => {
    const res = await putThresholds(
      jsonRequest('http://localhost/api/metric-config/thresholds', {
        thresholds: [
          {
            metricName: 'deliveryToBugRatio',
            greenMin: 1,
            greenMax: 0,
            amberMin: 0.26,
            amberMax: 0.5,
          },
        ],
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'thresholds.0.greenMax' })])
    );
    expect(prisma.thresholdConfig.upsert).not.toHaveBeenCalled();
  });

  it('PUT thresholds returns 422 for non-object JSON body', async () => {
    const res = await putThresholds(
      rawJsonRequest('http://localhost/api/metric-config/thresholds', 'null')
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual([expect.objectContaining({ field: 'body' })]);
  });

  it('PUT thresholds returns 422 for non-object threshold entries', async () => {
    const res = await putThresholds(
      jsonRequest('http://localhost/api/metric-config/thresholds', { thresholds: [null] })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual([expect.objectContaining({ field: 'thresholds.0' })]);
  });

  it('PUT thresholds persists valid threshold rows', async () => {
    const payload = {
      thresholds: [
        {
          metricName: 'overheadPercent',
          greenMin: 0,
          greenMax: 25,
          amberMin: 25.01,
          amberMax: 40,
        },
      ],
    };

    const res = await putThresholds(
      jsonRequest('http://localhost/api/metric-config/thresholds', payload)
    );

    expect(res.status).toBe(200);
    expect(prisma.thresholdConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { metricName: 'overheadPercent' },
        update: expect.objectContaining({ greenMax: 25 }),
      })
    );
  });

  it('PUT engine rejects invalid cutoffs and rolling window', async () => {
    const res = await putEngine(
      jsonRequest('http://localhost/api/metric-config/engine', {
        velocityGreenFloor: 0.7,
        velocityAmberFloor: 1,
        rollingWindow: 0,
        cycleTimeRollingWindow: 0,
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'velocityAmberFloor' }),
        expect.objectContaining({ field: 'rollingWindow' }),
        expect.objectContaining({ field: 'cycleTimeRollingWindow' }),
      ])
    );
    expect(prisma.metricEngineConfig.upsert).not.toHaveBeenCalled();
  });

  it('PUT engine returns 422 for non-object JSON body', async () => {
    const res = await putEngine(
      rawJsonRequest('http://localhost/api/metric-config/engine', 'null')
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual([expect.objectContaining({ field: 'body' })]);
  });

  it('PUT engine rejects coercible non-number values', async () => {
    const res = await putEngine(
      jsonRequest('http://localhost/api/metric-config/engine', {
        velocityGreenFloor: true,
        velocityAmberFloor: true,
        rollingWindow: true,
        cycleTimeRollingWindow: true,
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'velocityGreenFloor' }),
        expect.objectContaining({ field: 'velocityAmberFloor' }),
        expect.objectContaining({ field: 'rollingWindow' }),
        expect.objectContaining({ field: 'cycleTimeRollingWindow' }),
      ])
    );
    expect(prisma.metricEngineConfig.upsert).not.toHaveBeenCalled();
  });

  it('PUT engine upserts the singleton row', async () => {
    const res = await putEngine(
      jsonRequest('http://localhost/api/metric-config/engine', {
        velocityGreenFloor: 1.2,
        velocityAmberFloor: 0.8,
        rollingWindow: 2,
        cycleTimeRollingWindow: 3,
      })
    );

    expect(res.status).toBe(200);
    expect(prisma.metricEngineConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'default' },
        update: {
          velocityGreenFloor: 1.2,
          velocityAmberFloor: 0.8,
          rollingWindow: 2,
          cycleTimeRollingWindow: 3,
        },
      })
    );
  });

  it('PUT engine defaults cycle-time window for legacy payloads', async () => {
    const res = await putEngine(
      jsonRequest('http://localhost/api/metric-config/engine', {
        velocityGreenFloor: 1.2,
        velocityAmberFloor: 0.8,
        rollingWindow: 2,
      })
    );

    expect(res.status).toBe(200);
    expect(prisma.metricEngineConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          rollingWindow: 2,
          cycleTimeRollingWindow: DEFAULT_ENGINE_CONFIG.cycleTimeRollingWindow,
        }),
      })
    );
  });

  it('PUT rules rejects unknown category and type', async () => {
    const res = await putRules(
      jsonRequest('http://localhost/api/metric-config/rules', {
        rules: [{ category: 'bad', workItemType: 'Unknown', included: true }],
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'rules.0.category' }),
        expect.objectContaining({ field: 'rules.0.workItemType' }),
      ])
    );
    expect(prisma.metricRuleConfig.upsert).not.toHaveBeenCalled();
  });

  it('PUT rules returns 422 for non-object JSON body', async () => {
    const res = await putRules(rawJsonRequest('http://localhost/api/metric-config/rules', 'null'));
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual([expect.objectContaining({ field: 'body' })]);
  });

  it('PUT rules returns 422 for non-object rule entries', async () => {
    const res = await putRules(
      jsonRequest('http://localhost/api/metric-config/rules', { rules: [null] })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual([expect.objectContaining({ field: 'rules.0' })]);
  });

  it('PUT rules persists valid rows and allows all types excluded', async () => {
    const rules = DEFAULT_METRIC_RULE_CONFIGS.filter(
      (rule) => rule.category === 'deliveryPoints'
    ).map((rule) => ({ ...rule, included: false }));

    const res = await putRules(jsonRequest('http://localhost/api/metric-config/rules', { rules }));

    expect(res.status).toBe(200);
    expect(prisma.metricRuleConfig.upsert).toHaveBeenCalledTimes(rules.length);
    expect(prisma.metricRuleConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category_workItemType: {
            category: 'deliveryPoints',
            workItemType: rules[0].workItemType,
          },
        },
      })
    );
  });

  it('GET returns includeAdpMetrics true by default', async () => {
    prisma.metricEngineConfig.findUnique.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.engine.includeAdpMetrics).toBe(true);
  });

  it('PUT rules persists includeAdpMetrics false in the same transaction', async () => {
    const rules = DEFAULT_METRIC_RULE_CONFIGS.slice(0, 1);
    prisma.metricEngineConfig.findUnique.mockResolvedValue({
      ...DEFAULT_ENGINE_CONFIG,
      includeAdpMetrics: false,
    });

    const res = await putRules(
      jsonRequest('http://localhost/api/metric-config/rules', {
        rules,
        includeAdpMetrics: false,
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.metricEngineConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'default' },
        update: { includeAdpMetrics: false },
      })
    );
    expect(data.includeAdpMetrics).toBe(false);
  });

  it('PUT rules rejects non-boolean includeAdpMetrics', async () => {
    const res = await putRules(
      jsonRequest('http://localhost/api/metric-config/rules', {
        rules: DEFAULT_METRIC_RULE_CONFIGS.slice(0, 1),
        includeAdpMetrics: 'false',
      })
    );
    const data = await res.json();

    expect(res.status).toBe(422);
    expect(data.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'includeAdpMetrics' })])
    );
    expect(prisma.metricEngineConfig.upsert).not.toHaveBeenCalled();
  });

  it('PUT rules without includeAdpMetrics leaves engine flag unchanged', async () => {
    prisma.metricEngineConfig.findUnique.mockResolvedValue({
      ...DEFAULT_ENGINE_CONFIG,
      includeAdpMetrics: false,
    });

    const res = await putRules(
      jsonRequest('http://localhost/api/metric-config/rules', {
        rules: DEFAULT_METRIC_RULE_CONFIGS.slice(0, 1),
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(prisma.metricEngineConfig.upsert).not.toHaveBeenCalled();
    expect(data.includeAdpMetrics).toBe(false);
  });

  it('returns 500 when config load fails', async () => {
    prisma.thresholdConfig.findMany.mockRejectedValue(new Error('DB unavailable'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('DB unavailable');
  });
});
