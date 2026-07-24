import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';
function run(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/v1/admin/patches' }); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); } }
export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
export async function PUT(req: NextRequest) { return run(req); }
export async function DELETE(req: NextRequest) { return run(req); }
