import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const dashboard = await readFile('components/ops/OpsDashboard.tsx', 'utf8');
const adapters = await readFile('lib/ops-api.ts', 'utf8');
const flagRoute = await readFile('app/api/admin/flags/[key]/route.ts', 'utf8');

test('config is adapted from the config entry array without legacy nested config', () => {
  assert.match(adapters, /Array\.isArray\(payload\.config\)/);
  assert.match(adapters, /Object\.fromEntries/);
  assert.doesNotMatch(dashboard, /config\.(admin|patch|matchmaking|featureFlags)/);
});

test('dashboard remains renderable with safe config and count fallbacks', () => {
  assert.match(dashboard, /config\[key\]\?\.value/);
  assert.match(dashboard, /data\.dashboard\.playersOnline \?\?/);
  assert.match(adapters, /Array\.isArray\(value\).*value\[0\]\.count/s);
});

test('independent endpoint failures do not reject the entire dashboard refresh', () => {
  assert.match(dashboard, /Promise\.allSettled/);
  assert.match(dashboard, /Partial<Record<SectionKey, string>>/);
  assert.match(dashboard, /SectionError/);
});

test('matchmaking controls patch the production config keys', () => {
  for (const key of ['matchmaking_enabled', 'play_button_enabled', 'accept_timeout_seconds', 'maintenance_enabled', 'maintenance_message']) {
    assert.match(dashboard, new RegExp(`updateConfig\\('${key}'`));
  }
  assert.match(dashboard, /JSON\.stringify\(\{ key, value \}\)/);
});

test('feature flags use their dedicated backend endpoint', () => {
  assert.match(dashboard, /\/api\/admin\/flags/);
  assert.match(flagRoute, /\/v1\/admin\/feature-flags\/\$\{encodeURIComponent\(params\.key\)\}/);
});

test('backend error objects become safe string messages', () => {
  assert.match(adapters, /text\(error\.message\) \?\? text\(error\.code\)/);
  assert.doesNotMatch(adapters, /new Error\(data\?\.error/);
});

test('unauthorized API responses redirect to ops login', () => {
  assert.match(adapters, /response\.status === 401/);
  assert.match(adapters, /window\.location\.assign\('\/ops\/login'\)/);
});

test('all supported response envelopes have explicit adapters', () => {
  for (const envelope of ['queues', 'matches', 'audit', 'patches', 'players']) assert.match(adapters, new RegExp(`['"]${envelope}['"]`));
  assert.match(adapters, /payload\.featureFlags/);
  for (const type of ['RuntimeConfigEntry', 'FeatureFlag', 'DashboardStats', 'QueueEntry', 'Match', 'AuditEntry', 'Patch', 'Player']) assert.match(adapters, new RegExp(`type ${type}`));
});
