import { NextResponse } from 'next/server';
import { AdoRequestError, fetchAdoTeams, isAdoAuthError } from '@/lib/sync/ado-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project')?.trim();

    if (!project) {
      return NextResponse.json({ error: 'Project is required' }, { status: 400 });
    }

    const teams = await fetchAdoTeams(project);
    return NextResponse.json({ teams });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown ADO discovery error';
    const status = err instanceof AdoRequestError && err.status === 404 ? 404 : 503;
    return NextResponse.json(
      { error: message, ...(isAdoAuthError(err) && { errorCode: 'ADO_AUTH_FAILURE' }) },
      { status }
    );
  }
}
