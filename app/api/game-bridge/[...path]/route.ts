import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEFAULT_BACKEND = 'https://trustdotabackend-production.up.railway.app';
const SESSION_ID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const SESSION_ACTION = new RegExp(
  `^/v1/game-sessions/${SESSION_ID}/(heartbeat|events|result)$`,
  'i',
);

function backendBaseUrl() {
  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND).replace(/\/$/, '');
}

export function allowedGamePath(segments: string[]) {
  const path = `/${segments.join('/')}`;
  if (path === '/ready' || path === '/v1/game-sessions/bootstrap') return path;
  return SESSION_ACTION.test(path) ? path : null;
}

async function forward(req: NextRequest, context: { params: { path: string[] } }) {
  const path = allowedGamePath(context.params.path || []);
  if (!path) {
    return NextResponse.json(
      { error: { code: 'GAME_BRIDGE_ROUTE_FORBIDDEN', message: 'Route is not available through the game bridge' } },
      { status: 404 },
    );
  }

  const headers = new Headers({
    accept: 'application/json',
    'user-agent': 'TRUST-Vercel-Game-Bridge/1.0',
    'x-trust-game-bridge': 'vercel',
  });
  const authorization = req.headers.get('authorization');
  const contentType = req.headers.get('content-type');
  if (authorization) headers.set('authorization', authorization);
  if (contentType) headers.set('content-type', contentType);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };
  if (!['GET', 'HEAD'].includes(req.method)) init.body = await req.text();

  try {
    const upstream = await fetch(`${backendBaseUrl()}${path}`, init);
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'GAME_BRIDGE_UPSTREAM_UNAVAILABLE', message: 'TRUST backend is unavailable' } },
      { status: 503 },
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { path: string[] } },
) {
  return forward(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: { path: string[] } },
) {
  return forward(req, context);
}
