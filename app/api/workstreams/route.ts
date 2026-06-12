import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateWorkstreamRegistryInput } from '@/lib/sync/workstream-validation';

function safeDatabaseTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    return { configured: false };
  }
  try {
    const url = new URL(raw);
    return {
      configured: true,
      protocol: url.protocol,
      host: url.host,
      database: url.pathname.replace(/^\//, ''),
      schema: url.searchParams.get('schema') ?? 'public',
    };
  } catch {
    return { configured: true, parseable: false };
  }
}

function debugRegistryLog(hypothesisId: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7536/ingest/a2aecde1-a79a-4148-a39b-e39a7d81f8a8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'abae78' },
    body: JSON.stringify({
      sessionId: 'abae78',
      runId: 'registry-load-initial',
      hypothesisId,
      location: 'app/api/workstreams/route.ts',
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

const WORKSTREAM_SELECT = {
  id: true,
  name: true,
  adoAreaPath: true,
  adoOrg: true,
  adoProject: true,
  adoTeamId: true,
  syncEnabled: true,
} as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDisabled = searchParams.get('includeDisabled') === 'true';
    debugRegistryLog('H2,H4', 'GET /api/workstreams entered', {
      includeDisabled,
      databaseTarget: safeDatabaseTarget(),
    });

    try {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'workstreams'
        ORDER BY ordinal_position
      `;
      debugRegistryLog('H1,H2,H3', 'Runtime workstreams columns before registry query', {
        columns: columns.map((column) => column.column_name),
        hasAdoOrg: columns.some((column) => column.column_name === 'adoOrg'),
        hasSyncEnabled: columns.some((column) => column.column_name === 'syncEnabled'),
      });
    } catch (probeErr) {
      debugRegistryLog('H1,H2', 'Failed to inspect runtime workstreams columns', {
        error: probeErr instanceof Error ? probeErr.message : String(probeErr),
      });
    }

    const workstreams = await prisma.workstream.findMany({
      where: includeDisabled ? undefined : { syncEnabled: true },
      select: WORKSTREAM_SELECT,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ workstreams });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    debugRegistryLog('H1,H2,H3,H4', 'GET /api/workstreams failed', {
      errorName: err instanceof Error ? err.name : typeof err,
      message,
      includeDisabled: (() => {
        try {
          return new URL(request.url).searchParams.get('includeDisabled') === 'true';
        } catch {
          return null;
        }
      })(),
      databaseTarget: safeDatabaseTarget(),
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { data, errors } = validateWorkstreamRegistryInput(body);

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const existing = await prisma.workstream.findFirst({
      where: { name: data.name },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { errors: [{ field: 'name', message: 'Workstream name already exists' }] },
        { status: 422 }
      );
    }

    const workstream = await prisma.workstream.create({
      data: {
        name: data.name!,
        adoOrg: data.adoOrg!,
        adoProject: data.adoProject!,
        adoTeamId: data.adoTeamId!,
        adoAreaPath: data.adoAreaPath!,
        syncEnabled: data.syncEnabled ?? true,
      },
      select: WORKSTREAM_SELECT,
    });

    return NextResponse.json({ workstream }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
