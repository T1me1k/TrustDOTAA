import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';
function unauthorized() { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
export async function GET(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/admin/config' }); } catch { return unauthorized(); } }
export async function PUT(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/admin/config' }); } catch { return unauthorized(); } }
