import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SYNC_CONFIG } from '@/lib/sync/config';
import { validateSyncProgramConfigInput } from '@/lib/sync/workstream-validation';

const DEFAULT_SYNC_CONFIG_KEY = 'default';
const DEFAULT_ADO_ORG = 'Operations-Innovation';

function defaultProgramConfig() {
  return {
    key: DEFAULT_SYNC_CONFIG_KEY,
    adoOrg: process.env.ADO_ORG || DEFAULT_ADO_ORG,
    adoProject: SYNC_CONFIG.projectNameOrId,
    iterationTeamId: SYNC_CONFIG.iterationTeamId,
    lookbackSprintCount: SYNC_CONFIG.lookbackSprintCount,
  };
}

export async function GET() {
  try {
    const config = await prisma.syncProgramConfig.findUnique({
      where: { key: DEFAULT_SYNC_CONFIG_KEY },
    });

    return NextResponse.json({ config: config ?? defaultProgramConfig() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { data, errors } = validateSyncProgramConfigInput(body);

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const config = await prisma.syncProgramConfig.upsert({
      where: { key: DEFAULT_SYNC_CONFIG_KEY },
      update: {
        adoOrg: data.adoOrg!,
        adoProject: data.adoProject!,
        iterationTeamId: data.iterationTeamId!,
        lookbackSprintCount: data.lookbackSprintCount!,
      },
      create: {
        key: DEFAULT_SYNC_CONFIG_KEY,
        adoOrg: data.adoOrg!,
        adoProject: data.adoProject!,
        iterationTeamId: data.iterationTeamId!,
        lookbackSprintCount: data.lookbackSprintCount!,
      },
    });

    return NextResponse.json({ config });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
