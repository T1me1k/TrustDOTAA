import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const upstream = await proxyToBackend(req, { path: '/v1/auth/steam/callback' });
  if (upstream.ok && !upstream.headers.get('location')) upstream.headers.set('location', new URL('/profile', req.url).toString());
  return upstream.ok && upstream.status === 200 ? new NextResponse(upstream.body, { status: 302, headers: upstream.headers }) : upstream;
}
