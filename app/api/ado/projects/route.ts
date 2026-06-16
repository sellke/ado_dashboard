import { NextResponse } from 'next/server';
import { AdoRequestError, fetchAdoProjects, isAdoAuthError } from '@/lib/sync/ado-client';

export async function GET() {
  try {
    const projects = await fetchAdoProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown ADO discovery error';
    const status = err instanceof AdoRequestError && err.status === 404 ? 404 : 503;
    return NextResponse.json(
      { error: message, ...(isAdoAuthError(err) && { errorCode: 'ADO_AUTH_FAILURE' }) },
      { status }
    );
  }
}
