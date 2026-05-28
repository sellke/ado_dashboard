import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

export const workstreams = [
  {
    name: 'Streams',
    adoAreaPath: 'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Streams',
  },
  {
    name: 'Pitch Tracker',
    adoAreaPath: 'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Pitch Tracker',
  },
  {
    name: 'Action Tracker',
    adoAreaPath: 'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Action Tracker',
  },
  {
    name: 'KPI Services',
    adoAreaPath: 'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Tier Boards',
  },
  {
    name: 'UCM',
    adoAreaPath:
      'Event Streaming Platform\\App\\LiveLink - Yellow Box\\Unified Configuration Manager',
  },
];

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

const ADO_ITER_BASE = 'Event Streaming Platform\\App\\LiveLink - Yellow Box';

export const sprints = [
  {
    name: 'Sprint 4 Q4 FY26',
    adoIterationPath: `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 4`,
    startDate: new Date('2026-02-16'),
    endDate: new Date('2026-02-27'),
  },
  {
    name: 'Sprint 5 Q4 FY26',
    adoIterationPath: `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 5`,
    startDate: new Date('2026-03-02'),
    endDate: new Date('2026-03-13'),
  },
  {
    name: 'Sprint 6 Q4 FY26',
    adoIterationPath: `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 6`,
    startDate: new Date('2026-03-16'),
    endDate: new Date('2026-03-27'),
  },
  {
    name: 'Sprint 7 Q4 FY26',
    adoIterationPath: `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 7`,
    startDate: new Date('2026-03-30'),
    endDate: new Date('2026-04-10'),
  },
  {
    name: 'Sprint 8 Q4 FY26',
    adoIterationPath: `${ADO_ITER_BASE}\\Q4 FY26\\Sprint 8`,
    startDate: new Date('2026-04-13'),
    endDate: new Date('2026-04-24'),
  },
  {
    name: 'Sprint 1 Q1 FY27',
    adoIterationPath: `${ADO_ITER_BASE}\\Q1 FY27\\Sprint 1`,
    startDate: new Date('2026-04-27'),
    endDate: new Date('2026-05-08'),
  },
];

// ---------------------------------------------------------------------------
// Seed Function
// ---------------------------------------------------------------------------

export async function seedDatabase(client: PrismaClient = prisma) {
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

  // --- Sprints (canonical key: adoIterationPath; match by path to avoid naming collision with ADO) ---
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
