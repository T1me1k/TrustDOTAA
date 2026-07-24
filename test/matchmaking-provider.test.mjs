import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const provider = await readFile('components/MatchmakingProvider.tsx', 'utf8');
const home = await readFile('components/HomeClient.tsx', 'utf8');

test('matchmaking no longer fabricates match-found with timer mock flow', () => {
  assert.doesNotMatch(provider, /setTimeout\(\(\) => setPhase\('found'/);
  assert.match(provider, /\/api\/queue\/join/);
  assert.match(provider, /\/api\/queue\/status/);
  assert.match(provider, /\/api\/matches\/\$\{match\.id\}\/accept/);
  assert.match(provider, /\/api\/matches\/\$\{match\.id\}\/decline/);
});

test('primary and secondary role controls prevent identical roles', () => {
  assert.match(home, /Secondary role/);
  assert.match(home, /disabled=\{secondaryRole === item\}/);
  assert.match(home, /disabled=\{primaryRole === item\}/);
});
