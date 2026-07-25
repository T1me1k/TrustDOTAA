import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    assertAdmin();
    return proxyToBackend(req, {
      admin: true,
      path: `/v1/admin/game-sessions/${encodeURIComponent(params.sessionId)}`,
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
