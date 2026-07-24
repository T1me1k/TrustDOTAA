import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';

function unauthorized() { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }

export async function GET(req: NextRequest) {
  try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/v1/admin/config' }); }
  catch { return unauthorized(); }
}

export async function PATCH(req: NextRequest) {
  try {
    assertAdmin();
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || typeof (body as { key?: unknown }).key !== 'string' || !('value' in body)) {
      return Response.json({ error: 'Config key and value are required' }, { status: 400 });
    }
    const { key, value } = body as { key: string; value: unknown };
    if (!key || key.includes('/') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return Response.json({ error: 'Invalid config key' }, { status: 400 });
    }
    const upstreamRequest = new NextRequest(req.url, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value }),
    });
    return proxyToBackend(upstreamRequest, { admin: true, method: 'PATCH', path: `/v1/admin/config/${encodeURIComponent(key)}` });
  } catch { return unauthorized(); }
}
