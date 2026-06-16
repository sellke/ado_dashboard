import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_ENGINE_CONFIG,
  DEFAULT_METRIC_ENGINE_CONFIG_KEY,
  DEFAULT_METRIC_RULE_CONFIGS,
} from '../lib/metrics/types';
import { SYNC_CONFIG } from '../lib/sync/config';
import {
  buildDefaultAdoAreaPath,
  DEFAULT_ADO_ORG,
  DEFAULT_SYNC_PROGRAM_CONFIG_KEY,
  DEFAULT_SYNC_WORKSTREAMS,
} from '../lib/sync/defaults';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

export function getSeedAdoOrg() {
  return process.env.ADO_ORG || DEFAULT_ADO_ORG;
}

export function buildSeedAdoAreaPath(adoAreaPathSuffix: string) {
  return buildDefaultAdoAreaPath(adoAreaPathSuffix);
}

export function getDefaultSyncProgramConfig(adoOrg = getSeedAdoOrg()) {
  return {
    key: DEFAULT_SYNC_PROGRAM_CONFIG_KEY,
    adoOrg,
    adoProject: SYNC_CONFIG.projectNameOrId,
    iterationTeamId: SYNC_CONFIG.iterationTeamId,
    lookbackSprintCount: SYNC_CONFIG.lookbackSprintCount,
  };
}

export const workstreams = DEFAULT_SYNC_WORKSTREAMS.map((workstream) => ({
  name: workstream.name,
  adoAreaPath: buildSeedAdoAreaPath(workstream.adoAreaPathSuffix),
  adoOrg: getSeedAdoOrg(),
  adoProject: SYNC_CONFIG.projectNameOrId,
  adoTeamId: workstream.teamId,
  syncEnabled: true,
}));

export const thresholdConfigs = [
  {
    metricName: 'sprintPredictability',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
    redMin: 0,
    redMax: 59.99,
  },
  {
    metricName: 'carryOverRate',
    greenMin: 0,
    greenMax: 10,
    amberMin: 10.01,
    amberMax: 25,
    redMin: 25.01,
    redMax: 100,
  },
  {
    metricName: 'overheadPercent',
    greenMin: 0,
    greenMax: 30,
    amberMin: 30.01,
    amberMax: 45,
    redMin: 45.01,
    redMax: 100,
  },
  {
    metricName: 'deliveryToBugRatio',
    greenMin: 0,
    greenMax: 0.25,
    amberMin: 0.26,
    amberMax: 0.5,
    redMin: 0.51,
    redMax: 999999,
  },
  {
    metricName: 'agingWipDays',
    greenMin: 0,
    greenMax: 5,
    amberMin: 5.01,
    amberMax: 10,
    redMin: 10.01,
    redMax: 999,
  },
  {
    metricName: 'scopeCreepIndex',
    greenMin: 0,
    greenMax: 10,
    amberMin: 10.01,
    amberMax: 20,
    redMin: 20.01,
    redMax: 100,
  },
  {
    metricName: 'milestoneMonthly',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
    redMin: 0,
    redMax: 59.99,
  },
  {
    metricName: 'milestoneQuarterly',
    greenMin: 80,
    greenMax: 100,
    amberMin: 60,
    amberMax: 79.99,
    redMin: 0,
    redMax: 59.99,
  },
];

export const metricEngineConfigs = [
  {
    key: DEFAULT_METRIC_ENGINE_CONFIG_KEY,
    velocityGreenFloor: DEFAULT_ENGINE_CONFIG.velocityGreenFloor,
    velocityAmberFloor: DEFAULT_ENGINE_CONFIG.velocityAmberFloor,
    rollingWindow: DEFAULT_ENGINE_CONFIG.rollingWindow,
    cycleTimeRollingWindow: DEFAULT_ENGINE_CONFIG.cycleTimeRollingWindow,
  },
];

export const metricRuleConfigs = DEFAULT_METRIC_RULE_CONFIGS;

const ADO_ITER_BASE = 'Event Streaming Platform\\App\\LiveLink - Yellow Box';
const LEGACY_SEEDED_SPRINT_PATHS = [
  `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 4`,
  `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 5`,
  `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 6`,
  `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 7`,
  `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 8`,
  `${ADO_ITER_BASE}\\Q1 FY27\\Sprint 1`,
];

export const sprints = [
  {
    name: 'Sprint 26.22',
    adoIterationPath: 'Event Streaming Platform\\FY26\\Q4\\Sprint 26.22',
    startDate: new Date('2026-02-16'),
    endDate: new Date('2026-02-27'),
  },
  {
    name: 'Sprint 26.23',
    adoIterationPath: 'Event Streaming Platform\\FY26\\Q4\\Sprint 26.23',
    startDate: new Date('2026-03-02'),
    endDate: new Date('2026-03-13'),
  },
  {
    name: 'Sprint 26.24',
    adoIterationPath: 'Event Streaming Platform\\FY26\\Q4\\Sprint 26.24',
    startDate: new Date('2026-03-16'),
    endDate: new Date('2026-03-27'),
  },
  {
    name: 'Sprint 26.25',
    adoIterationPath: 'Event Streaming Platform\\FY26\\Q4\\Sprint 26.25',
    startDate: new Date('2026-03-30'),
    endDate: new Date('2026-04-10'),
  },
  {
    name: 'Sprint 26.26',
    adoIterationPath: 'Event Streaming Platform\\FY26\\Q4\\Sprint 26.26',
    startDate: new Date('2026-04-13'),
    endDate: new Date('2026-04-24'),
  },
  {
    name: 'Sprint 27.1',
    adoIterationPath: 'Event Streaming Platform\\FY27\\Q1\\Sprint 27.1',
    startDate: new Date('2026-04-27'),
    endDate: new Date('2026-05-08'),
  },
];

// ---------------------------------------------------------------------------
// Seed Function
// ---------------------------------------------------------------------------

export async function seedDatabase(client: PrismaClient = prisma) {
  const programConfig = getDefaultSyncProgramConfig();

  // --- Program sync config (singleton key → upsert) ---
  await client.syncProgramConfig.upsert({
    where: { key: programConfig.key },
    update: {
      adoOrg: programConfig.adoOrg,
      adoProject: programConfig.adoProject,
      iterationTeamId: programConfig.iterationTeamId,
      lookbackSprintCount: programConfig.lookbackSprintCount,
    },
    create: programConfig,
  });
  console.log('Created sync program config');

  // --- Workstreams (no unique constraint on name → findFirst pattern) ---
  for (const ws of workstreams) {
    const existing = await client.workstream.findFirst({ where: { name: ws.name } });
    if (existing) {
      await client.workstream.update({ where: { id: existing.id }, data: ws });
    } else {
      await client.workstream.create({ data: ws });
    }
  }
  console.log(`Created ${workstreams.length} workstreams`);

  // --- Threshold configs (metricName is unique → upsert) ---
  for (const config of thresholdConfigs) {
    await client.thresholdConfig.upsert({
      where: { metricName: config.metricName },
      update: {
        greenMin: config.greenMin,
        greenMax: config.greenMax,
        amberMin: config.amberMin,
        amberMax: config.amberMax,
        redMin: config.redMin,
        redMax: config.redMax,
      },
      create: config,
    });
  }
  console.log(`Created ${thresholdConfigs.length} threshold configs`);

  // --- Metric engine config (singleton key → upsert) ---
  for (const config of metricEngineConfigs) {
    await client.metricEngineConfig.upsert({
      where: { key: config.key },
      update: {
        velocityGreenFloor: config.velocityGreenFloor,
        velocityAmberFloor: config.velocityAmberFloor,
        rollingWindow: config.rollingWindow,
      },
      create: config,
    });
  }
  console.log(`Created ${metricEngineConfigs.length} metric engine configs`);

  // --- Metric rule configs (category + workItemType unique → upsert) ---
  for (const config of metricRuleConfigs) {
    await client.metricRuleConfig.upsert({
      where: {
        category_workItemType: {
          category: config.category,
          workItemType: config.workItemType,
        },
      },
      update: { included: config.included },
      create: config,
    });
  }
  console.log(`Created ${metricRuleConfigs.length} metric rule configs`);

  // --- Sprints (canonical key: adoIterationPath; match by path to avoid naming collision with ADO) ---
  await client.sprint.deleteMany({
    where: {
      adoIterationPath: {
        in: LEGACY_SEEDED_SPRINT_PATHS,
      },
    },
  });

  for (const sp of sprints) {
    const existing = sp.adoIterationPath
      ? await client.sprint.findUnique({ where: { adoIterationPath: sp.adoIterationPath } })
      : await client.sprint.findFirst({ where: { name: sp.name } });
    if (existing) {
      await client.sprint.update({ where: { id: existing.id }, data: sp });
    } else {
      await client.sprint.create({ data: sp });
    }
  }
  console.log(`Created ${sprints.length} sprints`);
}

// ---------------------------------------------------------------------------
// Auto-run when executed directly (not when imported)
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').includes('prisma/seed');

if (isDirectRun) {
  seedDatabase()
    .then(async () => {
      console.log('Seed completed successfully');
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Seed failed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
