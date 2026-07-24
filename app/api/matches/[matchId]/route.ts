import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) { return proxyToBackend(req, { path: `/matches/${params.matchId}` }); }
