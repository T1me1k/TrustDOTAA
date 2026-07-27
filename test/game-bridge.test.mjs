import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const route = await readFile('app/api/game-bridge/[...path]/route.ts', 'utf8');

test('game bridge forwards only the public game-session protocol', () => {
  assert.match(route, /\/ready/);
  assert.match(route, /\/v1\/game-sessions\/bootstrap/);
  assert.match(route, /heartbeat\|events\|result/);
  assert.match(route, /GAME_BRIDGE_ROUTE_FORBIDDEN/);
  assert.doesNotMatch(route, /BACKEND_ADMIN_API_KEY/);
  assert.doesNotMatch(route, /\/v1\/admin/);
});

test('game bridge preserves the short-lived bearer token without logging it', () => {
  assert.match(route, /req\.headers\.get\('authorization'\)/);
  assert.match(route, /headers\.set\('authorization', authorization\)/);
  assert.doesNotMatch(route, /console\./);
});

test('game bridge uses the configured Railway backend and fails closed', () => {
  assert.match(route, /process\.env\.BACKEND_API_URL/);
  assert.match(route, /GAME_BRIDGE_UPSTREAM_UNAVAILABLE/);
  assert.match(route, /cache: 'no-store'/);
});
