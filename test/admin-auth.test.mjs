import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const middleware = await readFile('middleware.ts', 'utf8');
const login = await readFile('app/api/admin/auth/login/route.ts', 'utf8');
const auth = await readFile('lib/admin-auth.ts', 'utf8');
const config = await readFile('app/api/admin/config/route.ts', 'utf8');
const form = await readFile('components/ops/LoginForm.tsx', 'utf8');
const proxy = await readFile('lib/backend-proxy.ts', 'utf8');

const adminRoutes = ['audit', 'config', 'dashboard', 'flags', 'health', 'maintenance', 'matches', 'patches', 'players', 'queues', 'sanctions'];

test('middleware permits only the login page and login API without an existing cookie', () => {
  assert.match(middleware, /path==='\/ops\/login' \|\| path==='\/api\/admin\/auth\/login'/);
  assert.match(middleware, /path\.startsWith\('\/ops'\) \|\| path\.startsWith\('\/api\/admin'\)/);
  assert.match(middleware, /if\(!token\)/);
});

test('admin config remains protected in both middleware and its route handler', () => {
  assert.match(middleware, /trust_ops_session/);
  assert.match(config, /assertAdmin\(\)/);
  assert.match(config, /Unauthorized/);
});

test('valid credentials produce only ok and a hardened session cookie', () => {
  assert.match(login, /NextResponse\.json\(\{ok:true\}\)/);
  assert.match(login, /createSession\(response,email\)/);
  assert.match(auth, /response\.cookies\.set\(COOKIE, token/);
  assert.match(auth, /httpOnly:true/);
  assert.match(auth, /secure:process\.env\.NODE_ENV==='production'/);
  assert.match(auth, /sameSite:'lax'/);
  assert.match(auth, /path:'\/'/);
  assert.doesNotMatch(login, /json\([^\n]*(password|hash|secret)/i);
});

test('bad credentials return Invalid credentials and forged cookies fail route validation', () => {
  assert.match(login, /error:'Invalid credentials'/);
  assert.match(auth, /timingSafeEqual\(expected,supplied\)/);
  assert.match(auth, /if\(supplied\.length!==expected\.length/);
  assert.match(auth, /catch \{ return null; \}/);
  assert.match(config, /assertAdmin\(\)/);
});

test('login form starts blank and keeps credential and session errors distinct', () => {
  assert.doesNotMatch(form, /defaultValue=/);
  assert.match(form, /placeholder=\{emailPlaceholder\}/);
  assert.match(form, /data\.error \|\| \(res\.status===401 \? 'Unauthorized'/);
  assert.doesNotMatch(form, /admin@trust\.local/);
});

test('every admin proxy targets v1 admin endpoints and credentials stay server-side', async () => {
  for (const route of adminRoutes) {
    const source = await readFile(`app/api/admin/${route}/route.ts`, 'utf8');
    assert.match(source, /\/v1\/admin\//, route);
    assert.doesNotMatch(source, /path: ['"]\/admin\//, route);
  }
  assert.match(await readFile('app/api/admin/flags/route.ts', 'utf8'), /\/v1\/admin\/feature-flags/);
  assert.match(proxy, /headers\.set\('authorization', `Bearer \$\{key\}`\)/);
  assert.match(proxy, /process\.env\.BACKEND_ADMIN_API_KEY/);
  assert.doesNotMatch(form, /BACKEND_ADMIN_API_KEY|authorization/i);
});

test('config writes use the backend per-key PATCH contract rather than full PUT', async () => {
  const dashboard = await readFile('components/ops/OpsDashboard.tsx', 'utf8');
  assert.match(config, /export async function PATCH/);
  assert.match(config, /`\/v1\/admin\/config\/\$\{encodeURIComponent\(key\)\}`/);
  assert.match(config, /JSON\.stringify\(\{ value \}\)/);
  assert.doesNotMatch(config, /export async function PUT/);
  assert.match(dashboard, /method: 'PATCH'/);
  assert.match(dashboard, /JSON\.stringify\(\{ key, value \}\)/);
  assert.doesNotMatch(dashboard, /method: 'PUT'/);
});
