import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    assertAdmin();
    return proxyToBackend(req, {
      admin: true,
      path: '/v1/admin/game-sessions/diagnostic',
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    assertAdmin();
    return proxyToBackend(req, {
      admin: true,
      method: 'POST',
      path: '/v1/admin/game-sessions/diagnostic',
    });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
