import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND = 'https://trustdotabackend-production.up.railway.app';

export function backendBaseUrl() {
  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
}

type ProxyOptions = { admin?: boolean; method?: string; path: string };

function copySetCookie(upstream: Response, response: NextResponse) {
  const anyHeaders = upstream.headers as Headers & { getSetCookie?: () => string[] };
  const cookies = anyHeaders.getSetCookie?.() || [];
  const fallback = upstream.headers.get('set-cookie');
  for (const value of cookies.length ? cookies : fallback ? [fallback] : []) response.headers.append('set-cookie', value);
}

export async function proxyToBackend(req: NextRequest, { admin = false, method, path }: ProxyOptions) {
  const url = new URL(path, `${backendBaseUrl()}/`);
  req.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  const cookie = req.headers.get('cookie');
  if (contentType) headers.set('content-type', contentType);
  if (cookie) headers.set('cookie', cookie);
  if (admin) {
    const key = process.env.BACKEND_ADMIN_API_KEY;
    if (!key) return NextResponse.json({ error: 'BACKEND_ADMIN_API_KEY is not configured' }, { status: 500 });
    headers.set('x-admin-api-key', key);
    headers.set('authorization', `Bearer ${key}`);
  }
  const init: RequestInit = { method: method || req.method, headers, cache: 'no-store' };
  if (!['GET', 'HEAD'].includes(init.method || 'GET')) init.body = await req.text();
  try {
    const upstream = await fetch(url, init);
    const body = await upstream.text();
    const res = new NextResponse(body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' } });
    copySetCookie(upstream, res);
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Railway API unavailable', detail: error instanceof Error ? error.message : 'Unknown error' }, { status: 502 });
  }
}
