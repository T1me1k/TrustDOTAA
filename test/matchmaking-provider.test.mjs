import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const provider = await readFile('components/MatchmakingProvider.tsx', 'utf8');
const home = await readFile('components/HomeClient.tsx', 'utf8');

test('matchmaking no longer fabricates match-found with timer mock flow', () => {
  assert.doesNotMatch(provider, /setTimeout\(\(\) => setPhase\('found'/);
  assert.match(provider, /\/api\/backend\/queue\/join/);
  assert.match(provider, /\/api\/backend\/queue\/status/);
  assert.match(provider, /\/api\/backend\/matches\/\$\{matchId\}\/accept/);
  assert.match(provider, /\/api\/backend\/matches\/\$\{match\.id\}\/decline/);
});

test('only one role is sent and legacy secondary role is removed', () => {
  assert.doesNotMatch(home, /Secondary role|setSecondaryRole|secondaryRole/);
  assert.doesNotMatch(provider, /secondaryRole:\s*primaryRole/);
  assert.match(provider, /regions, primaryRole/);
});

test('Accept refetches details and preserves the original matchId', () => {
  assert.match(provider, /const matchId = match\.id/);
  assert.match(provider, /normalizeMatchDetails\(details, matchId\)/);
  assert.doesNotMatch(provider, /setMatch\(data\.match \|\| data\)/);
});

test('match details players are grouped by backend team with name fallback', () => {
  assert.match(provider, /data\.players\?\.reduce/);
  assert.match(provider, /team === 'dire'/);
  assert.match(provider, /p\.name \|\| p\.nickname/);
});
