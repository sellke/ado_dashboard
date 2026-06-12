import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const WORKSTREAM_SELECT = {
  id: true,
  name: true,
  adoAreaPath: true,
  adoOrg: true,
  adoProject: true,
  adoTeamId: true,
  syncEnabled: true,
} as const;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    if (typeof body.syncEnabled !== 'boolean') {
      return NextResponse.json(
        { errors: [{ field: 'syncEnabled', message: 'syncEnabled must be a boolean' }] },
        { status: 422 }
      );
    }

    const existing = await prisma.workstream.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workstream not found' }, { status: 404 });
    }

    const workstream = await prisma.workstream.update({
      where: { id },
      data: { syncEnabled: body.syncEnabled },
      select: WORKSTREAM_SELECT,
    });

    return NextResponse.json({ workstream });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
