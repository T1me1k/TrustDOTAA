import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    assertAdmin();
    return proxyToBackend(req, {
      admin: true,
      path: `/v1/admin/matches/${encodeURIComponent(params.matchId)}/game-sessions`,
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  try {
    assertAdmin();
    return proxyToBackend(req, {
      admin: true,
      method: 'POST',
      path: `/v1/admin/matches/${encodeURIComponent(params.matchId)}/game-session`,
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
