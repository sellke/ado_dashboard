/**
 * @jest-environment node
 */

import { execSync } from 'child_process';
import {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRIC_ENGINE_CONFIG_KEY,
  DEFAULT_METRIC_RULE_CONFIGS,
} from '@/lib/metrics/types';
import { SYNC_CONFIG } from '@/lib/sync/config';
import { DEFAULT_SYNC_WORKSTREAMS } from '@/lib/sync/defaults';
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
    it('should create 5 workstreams', async () => {
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

    it('should seed registry fields from SYNC_CONFIG', async () => {
      const rows = await prisma.workstream.findMany({ orderBy: { name: 'asc' } });
      const rowsByName = new Map(rows.map((row) => [row.name, row]));

      for (const config of DEFAULT_SYNC_WORKSTREAMS) {
        const row = rowsByName.get(config.name);
        expect(row).toBeDefined();
        expect(row!.adoOrg).toBe(process.env.ADO_ORG || 'Operations-Innovation');
        expect(row!.adoProject).toBe(SYNC_CONFIG.projectNameOrId);
        expect(row!.adoTeamId).toBe(config.teamId);
        expect(row!.adoAreaPath).toBe(
          `${SYNC_CONFIG.projectNameOrId}\\App\\LiveLink - Yellow Box${config.adoAreaPathSuffix}`
        );
        expect(row!.syncEnabled).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Sync Program Config
  // -----------------------------------------------------------------------
  describe('SyncProgramConfig', () => {
    it('should create the singleton sync program config with current defaults', async () => {
      const config = await prisma.syncProgramConfig.findUnique({
        where: { key: 'default' },
      });

      expect(config).not.toBeNull();
      expect(config!.adoOrg).toBe(process.env.ADO_ORG || 'Operations-Innovation');
      expect(config!.adoProject).toBe(SYNC_CONFIG.projectNameOrId);
      expect(config!.iterationTeamId).toBe(SYNC_CONFIG.iterationTeamId);
      expect(config!.lookbackSprintCount).toBe(SYNC_CONFIG.lookbackSprintCount);
    });
  });

  // -----------------------------------------------------------------------
  // Threshold Configs
  // -----------------------------------------------------------------------
  describe('ThresholdConfigs', () => {
    it('should create 8 threshold configs', async () => {
      const configs = await prisma.thresholdConfig.findMany();
      expect(configs).toHaveLength(8);
    });

    it('should have correct metric names', async () => {
      const configs = await prisma.thresholdConfig.findMany({ orderBy: { metricName: 'asc' } });
      const names = configs.map((c) => c.metricName);
      expect(names).toEqual([
        'agingWipDays',
        'carryOverRate',
        'deliveryToBugRatio',
        'milestoneMonthly',
        'milestoneQuarterly',
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

    it('should have correct deliveryToBugRatio thresholds', async () => {
      const config = await prisma.thresholdConfig.findUnique({
        where: { metricName: 'deliveryToBugRatio' },
      });
      expect(config).not.toBeNull();
      expect(config!.greenMin).toBe(0);
      expect(config!.greenMax).toBe(0.25);
      expect(config!.amberMin).toBe(0.26);
      expect(config!.amberMax).toBe(0.5);
      expect(config!.redMin).toBe(0.51);
      expect(config!.redMax).toBe(999999);
    });
  });

  // -----------------------------------------------------------------------
  // Metric Engine Configs
  // -----------------------------------------------------------------------
  describe('MetricEngineConfigs', () => {
    it('should create the singleton engine config with current defaults', async () => {
      const config = await prisma.metricEngineConfig.findUnique({
        where: { key: DEFAULT_METRIC_ENGINE_CONFIG_KEY },
      });

      expect(config).not.toBeNull();
      expect(config!.velocityGreenFloor).toBe(DEFAULT_ENGINE_CONFIG.velocityGreenFloor);
      expect(config!.velocityAmberFloor).toBe(DEFAULT_ENGINE_CONFIG.velocityAmberFloor);
      expect(config!.rollingWindow).toBe(DEFAULT_ENGINE_CONFIG.rollingWindow);
    });
  });

  // -----------------------------------------------------------------------
  // Metric Rule Configs
  // -----------------------------------------------------------------------
  describe('MetricRuleConfigs', () => {
    it('should create default rule rows for each category and work item type', async () => {
      const configs = await prisma.metricRuleConfig.findMany({
        orderBy: [{ category: 'asc' }, { workItemType: 'asc' }],
      });

      expect(configs).toHaveLength(DEFAULT_METRIC_RULE_CONFIGS.length);
      expect(
        configs.map(({ category, workItemType, included }) => ({
          category,
          workItemType,
          included,
        }))
      ).toEqual(
        [...DEFAULT_METRIC_RULE_CONFIGS].sort(
          (a, b) =>
            a.category.localeCompare(b.category) || a.workItemType.localeCompare(b.workItemType)
        )
      );
    });

    it('should encode zero-drift inclusion defaults', async () => {
      const deliveryRules = await prisma.metricRuleConfig.findMany({
        where: { category: 'deliveryPoints' },
      });
      const overheadRules = await prisma.metricRuleConfig.findMany({
        where: { category: 'overheadHours' },
      });

      expect(
        Object.fromEntries(deliveryRules.map((rule) => [rule.workItemType, rule.included]))
      ).toEqual({
        Bug: false,
        Epic: true,
        Feature: true,
        Spike: false,
        Support: true,
        Task: true,
        UserStory: true,
      });
      expect(
        Object.fromEntries(overheadRules.map((rule) => [rule.workItemType, rule.included]))
      ).toEqual({
        Bug: true,
        Epic: false,
        Feature: false,
        Spike: true,
        Support: true,
        Task: false,
        UserStory: false,
      });
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
        'Sprint 26.22',
        'Sprint 26.23',
        'Sprint 26.24',
        'Sprint 26.25',
        'Sprint 26.26',
        'Sprint 27.1',
      ]);
    });

    it('should have correct date range for first sprint', async () => {
      const sprint = await prisma.sprint.findFirst({
        where: { name: 'Sprint 26.22' },
      });
      expect(sprint).not.toBeNull();
      expect(sprint!.startDate).toEqual(new Date('2026-02-16'));
      expect(sprint!.endDate).toEqual(new Date('2026-02-27'));
    });

    it('should have ADO iteration paths', async () => {
      const sprint = await prisma.sprint.findFirst({
        where: { name: 'Sprint 27.1' },
      });
      expect(sprint).not.toBeNull();
      expect(sprint!.adoIterationPath).toBe(
        'Event Streaming Platform\\FY27\\Q1\\Sprint 27.1'
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
      const engineConfigs = await prisma.metricEngineConfig.findMany();
      const syncConfigs = await prisma.syncProgramConfig.findMany();
      const ruleConfigs = await prisma.metricRuleConfig.findMany();
      const sprints = await prisma.sprint.findMany();

      expect(workstreams).toHaveLength(5);
      expect(configs).toHaveLength(8);
      expect(engineConfigs).toHaveLength(1);
      expect(syncConfigs).toHaveLength(1);
      expect(ruleConfigs).toHaveLength(DEFAULT_METRIC_RULE_CONFIGS.length);
      expect(sprints).toHaveLength(6);
    });
  });
});
