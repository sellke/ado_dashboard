import type { PrismaClient } from '@prisma/client';
import { SYNC_CONFIG } from './config';
import { DEFAULT_ADO_ORG, DEFAULT_SYNC_PROGRAM_CONFIG_KEY } from './defaults';
import type { SyncProgramConfigInput, WorkstreamSyncTarget } from './types';

export async function loadSyncProgramConfig(db: PrismaClient): Promise<SyncProgramConfigInput> {
  const config = await db.syncProgramConfig.findUnique({
    where: { key: DEFAULT_SYNC_PROGRAM_CONFIG_KEY },
  });

  if (config) {
    return {
      adoOrg: config.adoOrg,
      adoProject: config.adoProject,
      iterationTeamId: config.iterationTeamId,
      lookbackSprintCount: config.lookbackSprintCount,
    };
  }

  return {
    adoOrg: process.env.ADO_ORG || DEFAULT_ADO_ORG,
    adoProject: SYNC_CONFIG.projectNameOrId,
    iterationTeamId: SYNC_CONFIG.iterationTeamId,
    lookbackSprintCount: SYNC_CONFIG.lookbackSprintCount,
  };
}

export async function loadSyncWorkstreams(db: PrismaClient): Promise<WorkstreamSyncTarget[]> {
  const workstreams = await db.workstream.findMany({
    where: { syncEnabled: true },
    select: {
      id: true,
      name: true,
      adoAreaPath: true,
      adoOrg: true,
      adoProject: true,
      adoTeamId: true,
    },
    orderBy: { name: 'asc' },
  });

  return workstreams;
}
