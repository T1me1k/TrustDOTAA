import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
import { adaptPublicRuntimeConfig, getRuntimeConfig, publicRuntimeConfig } from '@/lib/runtime-config';
export async function GET(req: NextRequest) {
  const upstream = await proxyToBackend(req, { path: '/v1/config/public' });
  if (upstream.ok) {
    try { return NextResponse.json(adaptPublicRuntimeConfig(await upstream.json()), { headers: { 'cache-control': 'no-store' } }); }
    catch { return NextResponse.json(publicRuntimeConfig(await getRuntimeConfig())); }
  }
  if (upstream.status < 500) return upstream;
  return NextResponse.json(publicRuntimeConfig(await getRuntimeConfig()), { status: 200, headers: { 'x-trust-backend-state': 'offline-fallback' } });
}
