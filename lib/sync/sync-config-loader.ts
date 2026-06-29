import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SYNC_CONFIG } from './config';
import { DEFAULT_ADO_ORG, DEFAULT_SYNC_PROGRAM_CONFIG_KEY } from './defaults';
import type { SyncProgramConfigInput, WorkstreamSyncTarget } from './types';

function envAdoOrg(): string {
  return process.env.ADO_ORG?.trim() || '';
}

export async function getResolvedAdoOrg(db: PrismaClient = prisma): Promise<string> {
  try {
    const config = await db.syncProgramConfig.findUnique({
      where: { key: DEFAULT_SYNC_PROGRAM_CONFIG_KEY },
      select: { adoOrg: true },
    });
    const storedOrg = config?.adoOrg?.trim();
    if (storedOrg) {
      return storedOrg;
    }
  } catch {
    // Fall through to env/default when DB is unavailable.
  }

  return envAdoOrg() || DEFAULT_ADO_ORG;
}

export async function saveAdoOrg(org: string, db: PrismaClient = prisma): Promise<void> {
  const trimmedOrg = org.trim();
  if (!trimmedOrg) {
    throw new Error('ADO organization is required.');
  }

  const existing = await db.syncProgramConfig.findUnique({
    where: { key: DEFAULT_SYNC_PROGRAM_CONFIG_KEY },
  });

  if (existing) {
    await db.syncProgramConfig.update({
      where: { key: DEFAULT_SYNC_PROGRAM_CONFIG_KEY },
      data: { adoOrg: trimmedOrg },
    });
    return;
  }

  await db.syncProgramConfig.create({
    data: {
      key: DEFAULT_SYNC_PROGRAM_CONFIG_KEY,
      adoOrg: trimmedOrg,
      adoProject: SYNC_CONFIG.projectNameOrId,
      iterationTeamId: SYNC_CONFIG.iterationTeamId,
      lookbackSprintCount: SYNC_CONFIG.lookbackSprintCount,
    },
  });
}

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
