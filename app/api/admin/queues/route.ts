import { NextRequest } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { proxyToBackend } from '@/lib/backend-proxy';
export async function GET(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/v1/admin/queues' }); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); } }
export async function POST(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/v1/admin/queues' }); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); } }
export async function PUT(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/v1/admin/queues' }); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); } }
export async function DELETE(req: NextRequest) { try { assertAdmin(); return proxyToBackend(req, { admin: true, path: '/v1/admin/queues' }); } catch { return Response.json({ error: 'Unauthorized' }, { status: 401 }); } }
