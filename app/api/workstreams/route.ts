import { NextResponse } from 'next/server';
import { bootstrapDefaultDataIfEmpty } from '@/lib/db/bootstrap';
import { prisma } from '@/lib/prisma';
import { validateWorkstreamRegistryInput } from '@/lib/sync/workstream-validation';

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

    await bootstrapDefaultDataIfEmpty(prisma);

    const workstreams = await prisma.workstream.findMany({
      where: includeDisabled ? undefined : { syncEnabled: true },
      select: WORKSTREAM_SELECT,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ workstreams });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
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
