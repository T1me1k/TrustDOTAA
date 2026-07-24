export type RuntimeConfigEntry = {
  key: string;
  value: unknown;
  description?: string;
  isPublic?: boolean;
  updatedBy?: string;
  updatedAt?: string;
};

export type FeatureFlag = { key: string; enabled: boolean; description?: string; environment?: string; updatedAt?: string };
export type DashboardStats = Record<string, number>;
export type QueueEntry = { id?: string; region?: string; status?: string; players?: number };
export type Match = { id?: string; matchId?: string; status?: string; region?: string; playersAccepted?: number; acceptedPlayers?: number };
export type AuditEntry = { id?: string; createdAt?: string; time?: string; actor?: string; admin?: string; action?: string; entity?: string; result?: string };
export type Patch = { id?: string; version?: string; name?: string; status?: string; releasedAt?: string; createdAt?: string };
export type Player = { id?: string; steamId?: string; personaName?: string; displayName?: string; trustScore?: number; status?: string };

type JsonRecord = Record<string, unknown>;
export const isRecord = (value: unknown): value is JsonRecord => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown) => typeof value === 'string' ? value : undefined;
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export function errorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) return fallback;
  const error = data.error;
  if (typeof error === 'string') return error;
  if (isRecord(error)) return text(error.message) ?? text(error.code) ?? fallback;
  return text(data.message) ?? fallback;
}

export async function loadJson(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, { cache: 'no-store', credentials: 'include', ...init });
  const raw = await response.text();
  let data: unknown = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (response.status === 401) {
    window.location.assign('/ops/login');
    throw new Error('Unauthorized');
  }
  if (!response.ok) throw new Error(errorMessage(data, response.statusText || 'Request failed'));
  return data;
}

export function adaptConfig(payload: unknown): Record<string, RuntimeConfigEntry> {
  if (!isRecord(payload) || !Array.isArray(payload.config)) return {};
  return Object.fromEntries(payload.config.flatMap((item): [string, RuntimeConfigEntry][] => {
    if (!isRecord(item) || typeof item.key !== 'string') return [];
    return [[item.key, { key: item.key, value: item.value, description: text(item.description), isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : undefined, updatedBy: text(item.updatedBy), updatedAt: text(item.updatedAt) }]];
  }));
}

function count(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value) && value.length && isRecord(value[0])) return number(value[0].count) ?? 0;
  return 0;
}

export function adaptDashboard(payload: unknown): DashboardStats {
  if (!isRecord(payload)) return {};
  const source = isRecord(payload.dashboard) ? payload.dashboard : payload;
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, count(value)]));
}

function envelope<T>(payload: unknown, key: string, adapt: (value: JsonRecord) => T): T[] {
  if (!isRecord(payload) || !Array.isArray(payload[key])) return [];
  return payload[key].filter(isRecord).map(adapt);
}

export const adaptQueues = (p: unknown): QueueEntry[] => envelope(p, 'queues', v => ({ id: text(v.id), region: text(v.region), status: text(v.status), players: number(v.players) }));
export const adaptMatches = (p: unknown): Match[] => envelope(p, 'matches', v => ({ id: text(v.id), matchId: text(v.matchId), status: text(v.status), region: text(v.region), playersAccepted: number(v.playersAccepted), acceptedPlayers: number(v.acceptedPlayers) }));
export const adaptAudit = (p: unknown): AuditEntry[] => envelope(p, 'audit', v => ({ id: text(v.id), createdAt: text(v.createdAt), time: text(v.time), actor: text(v.actor), admin: text(v.admin), action: text(v.action), entity: text(v.entity), result: text(v.result) }));
export const adaptPatches = (p: unknown): Patch[] => envelope(p, 'patches', v => ({ id: text(v.id), version: text(v.version), name: text(v.name), status: text(v.status), releasedAt: text(v.releasedAt), createdAt: text(v.createdAt) }));
export const adaptPlayers = (p: unknown): Player[] => envelope(p, 'players', v => ({ id: text(v.id), steamId: text(v.steamId), personaName: text(v.personaName), displayName: text(v.displayName), trustScore: number(v.trustScore), status: text(v.status) }));
export function adaptFeatureFlags(payload: unknown): FeatureFlag[] {
  if (!isRecord(payload) || !Array.isArray(payload.featureFlags)) return [];
  return payload.featureFlags.filter(isRecord).flatMap(value => typeof value.key === 'string' ? [{ key: value.key, enabled: value.enabled === true, description: text(value.description), environment: text(value.environment), updatedAt: text(value.updatedAt) }] : []);
}
