import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const proxy = await readFile('lib/backend-proxy.ts', 'utf8');
const guest = await readFile('app/api/backend/auth/guest/route.ts', 'utf8');
const join = await readFile('app/api/backend/queue/join/route.ts', 'utf8');
const cancel = await readFile('app/api/backend/queue/cancel/route.ts', 'utf8');
const status = await readFile('app/api/backend/queue/status/route.ts', 'utf8');
const accept = await readFile('app/api/backend/matches/[matchId]/accept/route.ts', 'utf8');
const decline = await readFile('app/api/backend/matches/[matchId]/decline/route.ts', 'utf8');
const adminConfig = await readFile('app/api/admin/config/route.ts', 'utf8');
const provider = await readFile('components/MatchmakingProvider.tsx', 'utf8');

test('cookie forwarding uses same-origin credentials and Set-Cookie forwarding', () => {
  assert.match(proxy, /headers\.set\('cookie'/);
  assert.match(proxy, /set-cookie/);
  assert.match(proxy, /credentials: 'include'/);
  assert.match(provider, /credentials: 'include'/);
});

test('guest auth proxies to v1 production backend through BFF', () => {
  assert.match(guest, /proxyToBackend/);
  assert.match(guest, /\/v1\/auth\/guest/);
  assert.match(provider, /\/api\/backend\/auth\/guest/);
});

test('queue join cancel and status proxy to v1 backend', () => {
  assert.match(join, /\/v1\/queue\/join/);
  assert.match(cancel, /\/v1\/queue\/cancel/);
  assert.match(status, /\/v1\/queue\/status/);
});

test('match accept and decline proxy to v1 backend', () => {
  assert.match(accept, /\/v1\/matches\/\$\{params\.matchId\}\/accept/);
  assert.match(decline, /\/v1\/matches\/\$\{params\.matchId\}\/decline/);
});

test('admin config route enforces Next.js ops session before backend admin API', () => {
  assert.match(adminConfig, /assertAdmin\(\)/);
  assert.match(adminConfig, /admin: true/);
  assert.match(adminConfig, /\/admin\/config/);
});

test('admin backend key is absent from client bundle source', async () => {
  for (const file of ['components/MatchmakingProvider.tsx', 'components/useRuntimeConfig.ts', 'components/ops/OpsDashboard.tsx']) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /BACKEND_ADMIN_API_KEY|NEXT_PUBLIC_.*ADMIN/);
  }
});

test('Steam authentication start and callback stay in the BFF', async () => {
  const start = await readFile('app/api/backend/auth/steam/start/route.ts', 'utf8');
  const callback = await readFile('app/api/backend/auth/steam/callback/route.ts', 'utf8');
  assert.match(start, /\/v1\/auth\/steam\/start/);
  assert.match(callback, /\/v1\/auth\/steam\/callback/);
  assert.match(callback, /\/profile/);
  assert.doesNotMatch(start + callback, /STEAM_API_KEY|NEXT_PUBLIC/);
});

test('locale uses an SSR cookie and English dictionary fallback', async () => {
  const layout = await readFile('app/layout.tsx', 'utf8');
  const locale = await readFile('components/LocaleProvider.tsx', 'utf8');
  assert.match(layout, /trust_locale/);
  assert.match(locale, /ru\[key\]\)\|\|en\[key\]/);
  assert.match(locale, /Intl\.PluralRules|Intl\.DateTimeFormat|Intl\.NumberFormat/);
});

test('public runtime config adapts incomplete backend envelopes with safe nested fallbacks', async () => {
  const runtime = await readFile('lib/runtime-config.ts', 'utf8');
  const route = await readFile('app/api/backend/config/public/route.ts', 'utf8');
  const home = await readFile('components/HomeClient.tsx', 'utf8');
  assert.match(route, /adaptPublicRuntimeConfig/);
  assert.match(runtime, /payload\.config/);
  assert.match(runtime, /defaultRuntimeConfig/);
  assert.match(runtime, /matchmaking_enabled/);
  assert.match(runtime, /play_button_enabled/);
  assert.match(home, /config\?\.content\?\.stats \?\? fallbackStats/);
});

test('/me maps expected 401 to a guest response and clients consume response.player', async () => {
  const me = await readFile('app/api/backend/me/route.ts', 'utf8');
  const nav = await readFile('components/Nav.tsx', 'utf8');
  const profile = await readFile('app/profile/page.tsx', 'utf8');
  assert.match(me, /upstream\.status === 401/);
  assert.match(me, /authenticated: false, player: null/);
  assert.match(nav + profile, /data\.player/);
  assert.match(nav + profile, /personaName/);
  assert.match(nav + profile, /avatarUrl/);
  assert.doesNotMatch(nav + profile, /account\?\.steam|profile\.steam/);
});

test('Steam proxy preserves manual redirects, Location and all Set-Cookie values', () => {
  assert.match(proxy, /redirect: 'manual'/);
  assert.match(proxy, /responseHeaders\.location/);
  assert.match(proxy, /getSetCookie/);
  assert.match(proxy, /headers\.append\('set-cookie'/);
});

test('guest rendering and localized error boundary are present', async () => {
  const errorBoundary = await readFile('app/error.tsx', 'utf8');
  const layout = await readFile('app/layout.tsx', 'utf8');
  assert.match(layout, /MatchmakingProvider/);
  assert.match(errorBoundary, /t\('clientErrorMessage'\)/);
  assert.match(errorBoundary, /t\('reload'\)/);
  assert.doesNotMatch(errorBoundary, /error\.stack/);
});
