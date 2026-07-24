import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const proxy = await readFile('lib/backend-proxy.ts', 'utf8');
const guest = await readFile('app/api/auth/guest/route.ts', 'utf8');
const adminConfig = await readFile('app/api/admin/config/route.ts', 'utf8');

test('backend proxy keeps secrets server-side and forwards cookies', () => {
  assert.match(proxy, /BACKEND_API_URL/);
  assert.match(proxy, /BACKEND_ADMIN_API_KEY/);
  assert.match(proxy, /headers\.set\('cookie'/);
  assert.match(proxy, /set-cookie/);
  assert.doesNotMatch(proxy, /NEXT_PUBLIC_.*ADMIN|NEXT_PUBLIC_.*SECRET|NEXT_PUBLIC_.*DATABASE/);
});

test('public auth route proxies guest auth to Railway BFF', () => {
  assert.match(guest, /proxyToBackend/);
  assert.match(guest, /\/auth\/guest/);
});

test('admin config route enforces Next.js ops session before backend admin API', () => {
  assert.match(adminConfig, /assertAdmin\(\)/);
  assert.match(adminConfig, /admin: true/);
  assert.match(adminConfig, /\/admin\/config/);
});
