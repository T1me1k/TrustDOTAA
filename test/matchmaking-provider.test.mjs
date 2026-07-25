import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const provider = await readFile('components/MatchmakingProvider.tsx', 'utf8');
const home = await readFile('components/HomeClient.tsx', 'utf8');

test('matchmaking is backed by server queue and match endpoints', () => {
  assert.doesNotMatch(provider, /setTimeout\(\(\) => setPhase\('found'/);
  assert.match(provider, /\/api\/backend\/queue\/join/);
  assert.match(provider, /\/api\/backend\/queue\/cancel/);
  assert.match(provider, /\/api\/backend\/me\/state/);
  assert.match(provider, /\/api\/backend\/matches\/\$\{match\.id\}\/accept/);
  assert.match(provider, /\/api\/backend\/matches\/\$\{match\.id\}\/decline/);
});

test('players can select one to five roles without a secondary-role model', () => {
  assert.doesNotMatch(home + provider, /Secondary role|setSecondaryRole|secondaryRole:/);
  assert.match(provider, /selectedRoles/);
  assert.match(provider, /roles: queueRoles/);
  assert.match(provider, /trust-roles/);
  assert.match(home, /selectedRoles\.includes/);
  assert.match(home, /toggleRole/);
});

test('Steam authentication is required in the client before queue join', () => {
  assert.match(provider, /steamAuthenticated !== true/);
  assert.match(provider, /STEAM_ACCOUNT_REQUIRED/);
  assert.match(home, /\/api\/backend\/auth\/steam\/start/);
  assert.match(home, /steamAuthenticated !== true/);
});

test('each queue attempt owns a fresh timer and cancellation clears it', () => {
  assert.match(provider, /setSearchStartedAt\(Date\.now\(\)\)/);
  assert.match(provider, /setSearchSeconds\(0\)/);
  assert.match(provider, /next\.queue\?\.joinedAt/);
  assert.match(provider, /refreshVersion\.current \+= 1/);
  assert.doesNotMatch(provider, /setSearchSeconds\(v\s*=>\s*v\s*\+\s*1\)/);
});

test('server envelopes restore active match teams and the current player', () => {
  assert.match(provider, /state\.activeMatch/);
  assert.match(provider, /payload\.teams/);
  assert.match(provider, /payload\.self/);
  assert.match(provider, /player\.primaryRole/);
});

test('legacy regions are migrated to the backend canonical contract before queue join', async () => {
  const data = await readFile('lib/data.ts', 'utf8');
  const runtime = await readFile('lib/runtime-config.ts', 'utf8');
  assert.doesNotMatch(data, /['"]NA['"]/);
  assert.doesNotMatch(runtime, /name:'NA'|id:'na'/);
  assert.match(provider, /item === 'NA' \? 'US East'/);
  assert.match(provider, /regions: queueRegions, roles: queueRoles/);
});
