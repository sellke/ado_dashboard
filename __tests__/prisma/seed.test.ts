/**
 * @jest-environment node
 */

import { execSync } from 'child_process';
import { cleanupTestData, prisma } from './helpers';

describe('Seed Script', () => {
  beforeAll(async () => {
    await cleanupTestData();
    // Run the seed script via tsx (same as pnpm run db:seed)
    execSync('pnpm exec tsx prisma/seed.ts', { stdio: 'pipe' });
  }, 30_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // -----------------------------------------------------------------------
  // Workstreams
  // -----------------------------------------------------------------------
  describe('Workstreams', () => {
    it('should create 4 workstreams', async () => {
      const workstreams = await prisma.workstream.findMany({ orderBy: { name: 'asc' } });
      expect(workstreams).toHaveLength(5);
    });

    it('should have correct workstream names', async () => {
      const workstreams = await prisma.workstream.findMany({ orderBy: { name: 'asc' } });
      const names = workstreams.map((ws) => ws.name);
      expect(names).toEqual(['Action Tracker', 'KPI Services', 'Pitch Tracker', 'Streams', 'UCM']);
    });

    it('should have correct ADO area paths', async () => {
      const streams = await prisma.workstream.findFirst({ where: { name: 'Streams' } });
      expect(streams).not.toBeNull();
      expect(streams!.adoAreaPath).toBe(
        'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Streams'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Threshold Configs
  // -----------------------------------------------------------------------
  describe('ThresholdConfigs', () => {
    it('should create 5 threshold configs', async () => {
      const configs = await prisma.thresholdConfig.findMany();
      expect(configs).toHaveLength(5);
    });

    it('should have correct metric names', async () => {
      const configs = await prisma.thresholdConfig.findMany({ orderBy: { metricName: 'asc' } });
      const names = configs.map((c) => c.metricName);
      expect(names).toEqual([
        'agingWipDays',
        'carryOverRate',
        'overheadPercent',
        'scopeCreepIndex',
        'sprintPredictability',
      ]);
    });

    it('should have correct sprintPredictability thresholds', async () => {
      const config = await prisma.thresholdConfig.findUnique({
        where: { metricName: 'sprintPredictability' },
      });
      expect(config).not.toBeNull();
      expect(config!.greenMin).toBe(80);
      expect(config!.greenMax).toBe(100);
      expect(config!.amberMin).toBe(60);
      expect(config!.amberMax).toBe(79.99);
      expect(config!.redMin).toBe(0);
      expect(config!.redMax).toBe(59.99);
    });
  });

  // -----------------------------------------------------------------------
  // Sprints
  // -----------------------------------------------------------------------
  describe('Sprints', () => {
    it('should create 6 sprints', async () => {
      const sprints = await prisma.sprint.findMany();
      expect(sprints).toHaveLength(6);
    });

    it('should have correct sprint names', async () => {
      const sprints = await prisma.sprint.findMany({ orderBy: { startDate: 'asc' } });
      const names = sprints.map((s) => s.name);
      expect(names).toEqual([
        'Sprint 1 Q3 FY26',
        'Sprint 2 Q3 FY26',
        'Sprint 3 Q3 FY26',
        'Sprint 4 Q3 FY26',
        'Sprint 5 Q3 FY26',
        'Sprint 1 Q4 FY26',
      ]);
    });

    it('should have correct date range for first sprint', async () => {
      const sprint = await prisma.sprint.findFirst({
        where: { name: 'Sprint 1 Q3 FY26' },
      });
      expect(sprint).not.toBeNull();
      expect(sprint!.startDate).toEqual(new Date('2025-10-14'));
      expect(sprint!.endDate).toEqual(new Date('2025-10-27'));
    });

    it('should have ADO iteration paths', async () => {
      const sprint = await prisma.sprint.findFirst({
        where: { name: 'Sprint 1 Q4 FY26' },
      });
      expect(sprint).not.toBeNull();
      expect(sprint!.adoIterationPath).toBe(
        'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Q4 FY26\\Sprint 1'
      );
    });
  });

  // -----------------------------------------------------------------------
  // Idempotency
  // -----------------------------------------------------------------------
  describe('Idempotency', () => {
    it('should not create duplicates when run twice', async () => {
      // Seed was already run in beforeAll — run it again
      execSync('pnpm exec tsx prisma/seed.ts', { stdio: 'pipe' });

      const workstreams = await prisma.workstream.findMany();
      const configs = await prisma.thresholdConfig.findMany();
      const sprints = await prisma.sprint.findMany();

      expect(workstreams).toHaveLength(4);
      expect(configs).toHaveLength(5);
      expect(sprints).toHaveLength(6);
    });
  });
});
