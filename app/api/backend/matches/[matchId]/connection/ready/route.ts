import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) { return proxyToBackend(req, { method: 'POST', path: `/v1/matches/${params.matchId}/connection/ready` }); }
