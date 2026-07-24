import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
  const upstream = await proxyToBackend(req, { path: '/v1/auth/steam/callback' });
  if ((upstream.ok || [301, 302, 303, 307, 308].includes(upstream.status))) {
    upstream.headers.set('location', new URL('/profile', req.url).toString());
    if (upstream.status === 200) return new NextResponse(upstream.body, { status: 302, headers: upstream.headers });
  }
  return upstream;
}
