/**
 * @jest-environment node
 */

import { cleanupTestData, prisma } from './helpers';

describe('ThresholdConfig model', () => {
  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create a ThresholdConfig with all required fields', async () => {
    const config = await prisma.thresholdConfig.create({
      data: {
        metricName: 'sprintPredictability',
        greenMin: 0.85,
        greenMax: 1.0,
        amberMin: 0.7,
        amberMax: 0.85,
      },
    });

    expect(config.metricName).toBe('sprintPredictability');
    expect(config.greenMin).toBe(0.85);
    expect(config.greenMax).toBe(1.0);
    expect(config.amberMin).toBe(0.7);
    expect(config.amberMax).toBe(0.85);
    expect(config.redMin).toBeNull();
    expect(config.redMax).toBeNull();
  });

  it('should create a ThresholdConfig with optional redMin and redMax', async () => {
    const config = await prisma.thresholdConfig.create({
      data: {
        metricName: 'sprintPredictability',
        greenMin: 0.85,
        greenMax: 1.0,
        amberMin: 0.7,
        amberMax: 0.85,
        redMin: 0.0,
        redMax: 0.7,
      },
    });

    expect(config.redMin).toBe(0.0);
    expect(config.redMax).toBe(0.7);
  });

  it('should auto-generate a CUID ID', async () => {
    const config = await prisma.thresholdConfig.create({
      data: {
        metricName: 'sprintPredictability',
        greenMin: 0.85,
        greenMax: 1.0,
        amberMin: 0.7,
        amberMax: 0.85,
      },
    });

    expect(config.id).toBeDefined();
    expect(typeof config.id).toBe('string');
    expect(config.id.length).toBeGreaterThan(0);
  });

  it('should auto-set createdAt and updatedAt timestamps', async () => {
    const before = new Date();

    const config = await prisma.thresholdConfig.create({
      data: {
        metricName: 'sprintPredictability',
        greenMin: 0.85,
        greenMax: 1.0,
        amberMin: 0.7,
        amberMax: 0.85,
      },
    });

    const after = new Date();

    expect(config.createdAt).toBeInstanceOf(Date);
    expect(config.updatedAt).toBeInstanceOf(Date);
    expect(config.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(config.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should enforce unique metricName constraint', async () => {
    await prisma.thresholdConfig.create({
      data: {
        metricName: 'sprintPredictability',
        greenMin: 0.85,
        greenMax: 1.0,
        amberMin: 0.7,
        amberMax: 0.85,
      },
    });

    await expect(
      prisma.thresholdConfig.create({
        data: {
          metricName: 'sprintPredictability',
          greenMin: 0.5,
          greenMax: 0.9,
          amberMin: 0.3,
          amberMax: 0.5,
        },
      })
    ).rejects.toThrow();
  });

  it('should require metricName field', async () => {
    await expect(
      prisma.thresholdConfig.create({
        data: {
          metricName: undefined as unknown as string,
          greenMin: 0.85,
          greenMax: 1.0,
          amberMin: 0.7,
          amberMax: 0.85,
        },
      })
    ).rejects.toThrow();
  });

  it('should require greenMin field', async () => {
    await expect(
      prisma.thresholdConfig.create({
        data: {
          metricName: 'test',
          greenMin: undefined as unknown as number,
          greenMax: 1.0,
          amberMin: 0.7,
          amberMax: 0.85,
        },
      })
    ).rejects.toThrow();
  });

  it('should require greenMax field', async () => {
    await expect(
      prisma.thresholdConfig.create({
        data: {
          metricName: 'test',
          greenMin: 0.85,
          greenMax: undefined as unknown as number,
          amberMin: 0.7,
          amberMax: 0.85,
        },
      })
    ).rejects.toThrow();
  });

  it('should require amberMin field', async () => {
    await expect(
      prisma.thresholdConfig.create({
        data: {
          metricName: 'test',
          greenMin: 0.85,
          greenMax: 1.0,
          amberMin: undefined as unknown as number,
          amberMax: 0.85,
        },
      })
    ).rejects.toThrow();
  });

  it('should require amberMax field', async () => {
    await expect(
      prisma.thresholdConfig.create({
        data: {
          metricName: 'test',
          greenMin: 0.85,
          greenMax: 1.0,
          amberMin: 0.7,
          amberMax: undefined as unknown as number,
        },
      })
    ).rejects.toThrow();
  });

  it('should query ThresholdConfig by unique metricName', async () => {
    await prisma.thresholdConfig.create({
      data: {
        metricName: 'sprintPredictability',
        greenMin: 0.85,
        greenMax: 1.0,
        amberMin: 0.7,
        amberMax: 0.85,
        redMin: 0.0,
        redMax: 0.7,
      },
    });

    const result = await prisma.thresholdConfig.findUnique({
      where: { metricName: 'sprintPredictability' },
    });

    expect(result).not.toBeNull();
    expect(result!.metricName).toBe('sprintPredictability');
    expect(result!.greenMin).toBe(0.85);
    expect(result!.greenMax).toBe(1.0);
    expect(result!.amberMin).toBe(0.7);
    expect(result!.amberMax).toBe(0.85);
    expect(result!.redMin).toBe(0.0);
    expect(result!.redMax).toBe(0.7);
  });

  it('should be stored in the threshold_configs table (snake_case mapping)', async () => {
    const config = await prisma.thresholdConfig.create({
      data: {
        metricName: 'testMetric',
        greenMin: 0.8,
        greenMax: 1.0,
        amberMin: 0.6,
        amberMax: 0.8,
      },
    });

    // Verify via raw SQL that the table name is snake_case
    const result = await prisma.$queryRaw<
      { id: string }[]
    >`SELECT id FROM threshold_configs WHERE id = ${config.id}`;

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(config.id);
  });

  it('should function independently without Workstream or Sprint dependencies', async () => {
    // Create ThresholdConfig without any reference to Workstream/Sprint
    const config = await prisma.thresholdConfig.create({
      data: {
        metricName: 'independentMetric',
        greenMin: 0.0,
        greenMax: 1.0,
        amberMin: 1.0,
        amberMax: 2.0,
      },
    });

    expect(config.id).toBeDefined();

    // Query it back independently
    const fetched = await prisma.thresholdConfig.findUnique({
      where: { metricName: 'independentMetric' },
    });
    expect(fetched).not.toBeNull();
  });
});
