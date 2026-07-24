import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const provider = await readFile('components/MatchmakingProvider.tsx', 'utf8');
const home = await readFile('components/HomeClient.tsx', 'utf8');

test('matchmaking no longer fabricates match-found with timer mock flow', () => {
  assert.doesNotMatch(provider, /setTimeout\(\(\) => setPhase\('found'/);
  assert.match(provider, /\/api\/backend\/queue\/join/);
  assert.match(provider, /\/api\/backend\/queue\/status/);
  assert.match(provider, /\/api\/backend\/matches\/\$\{match\.id\}\/accept/);
  assert.match(provider, /\/api\/backend\/matches\/\$\{match\.id\}\/decline/);
});

test('only one role is sent and legacy secondary role is removed', () => {
  assert.doesNotMatch(home, /Secondary role|setSecondaryRole|secondaryRole/);
  assert.doesNotMatch(provider, /secondaryRole:\s*primaryRole/);
  assert.match(provider, /regions, role: primaryRole/);
});
