import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile('components/ops/OpsDashboard.tsx', 'utf8');
const panel = await readFile('components/ops/GameSessionsPanel.tsx', 'utf8');
const adapters = await readFile('lib/ops-api.ts', 'utf8');
const matchSession = await readFile('app/api/admin/matches/[matchId]/game-session/route.ts', 'utf8');
const session = await readFile('app/api/admin/game-sessions/[sessionId]/route.ts', 'utf8');
const confirm = await readFile('app/api/admin/game-sessions/[sessionId]/confirm-result/route.ts', 'utf8');
const revoke = await readFile('app/api/admin/game-sessions/[sessionId]/revoke/route.ts', 'utf8');
const config = await readFile('app/api/admin/game-server/config/route.ts', 'utf8');

test('game sessions are integrated into the existing TRUST Ops navigation', () => {
  assert.match(dashboard, /Game Sessions/);
  assert.match(dashboard, /<GameSessionsPanel\/>/);
  assert.doesNotMatch(panel, /BACKEND_ADMIN_API_KEY|NEXT_PUBLIC_.*ADMIN/);
});

test('server-side routes enforce the ops session and backend admin authentication', () => {
  for (const route of [matchSession, session, confirm, revoke]) {
    assert.match(route, /assertAdmin\(\)/);
    assert.match(route, /admin: true/);
    assert.match(route, /proxyToBackend/);
  }
  assert.match(matchSession, /\/game-sessions/);
  assert.match(matchSession, /\/game-session/);
  assert.match(confirm, /\/confirm-result/);
  assert.match(revoke, /\/revoke/);
});

test('backend URL is exposed only as non-secret addon configuration after admin auth', () => {
  assert.match(config, /assertAdmin\(\)/);
  assert.match(config, /backendBaseUrl\(\)/);
  assert.doesNotMatch(config, /BACKEND_ADMIN_API_KEY/);
});

test('operator flow keeps unverified results behind an explicit confirmation', () => {
  assert.match(panel, /result_pending/);
  assert.match(panel, /Confirm & apply rating/);
  assert.match(panel, /confirmationRequired|confirm-result/);
  assert.match(panel, /Revoke token/);
  assert.match(panel, /ratingApplied|Rating, Trust Score/);
});

test('one-time bearer token is copied but never persisted in local storage', () => {
  assert.match(panel, /navigator\.clipboard\.writeText/);
  assert.match(panel, /bearerToken/);
  assert.doesNotMatch(panel, /localStorage|sessionStorage|document\.cookie/);
});

test('live status, roster, events, and safe payload adapters are present', () => {
  assert.match(panel, /setInterval/);
  assert.match(panel, /5000/);
  assert.match(panel, /Pinned roster/);
  assert.match(panel, /Event timeline/);
  for (const adapter of ['adaptGameSession', 'adaptGameSessions', 'adaptMatchDetails']) {
    assert.match(adapters, new RegExp(`function ${adapter}|const ${adapter}`));
  }
});

test('cancelled and completed matches are excluded from playable session issuance', () => {
  assert.match(panel, /filter\(match => activeMatchStates\.has\(match\.status/);
  assert.match(panel, /new Set\(\['ready', 'connecting', 'in_progress'\]\)/);
});
