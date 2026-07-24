import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) { return proxyToBackend(req, { path: '/v1/me/matches' }); }
