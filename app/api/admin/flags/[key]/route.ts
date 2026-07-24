import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function PATCH(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    assertAdmin();
    if (!params.key || params.key === '__proto__' || params.key === 'constructor' || params.key === 'prototype') {
      return Response.json({ error: 'Invalid feature flag key' }, { status: 400 });
    }
    return proxyToBackend(req, { admin: true, method: 'PATCH', path: `/v1/admin/feature-flags/${encodeURIComponent(params.key)}` });
  } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
}
