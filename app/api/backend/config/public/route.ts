import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
import { getRuntimeConfig, publicRuntimeConfig } from '@/lib/runtime-config';
export async function GET(req: NextRequest) {
  const upstream = await proxyToBackend(req, { path: '/v1/config/public' });
  if (upstream.status < 500) return upstream;
  return NextResponse.json(publicRuntimeConfig(await getRuntimeConfig()), { status: 200, headers: { 'x-trust-backend-state': 'offline-fallback' } });
}
