import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
export async function GET(req: NextRequest) {
  const upstream = await proxyToBackend(req, { path: '/v1/me' });
  if (upstream.status === 401) {
    return NextResponse.json({ authenticated: false, player: null }, { status: 200, headers: { 'cache-control': 'no-store' } });
  }
  return upstream;
}
