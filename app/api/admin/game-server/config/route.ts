import { assertAdmin } from '@/lib/admin-auth';
import { backendBaseUrl } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    assertAdmin();
    return Response.json({
      apiBaseUrl: backendBaseUrl(),
      addonId: 'trust_dota',
    }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
