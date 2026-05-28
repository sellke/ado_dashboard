import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const workstreams = await prisma.workstream.findMany({
      select: {
        id: true,
        name: true,
        adoAreaPath: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ workstreams });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
