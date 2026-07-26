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
export type Match = {
  id?: string;
  matchId?: string;
  roomCode?: string;
  status?: string;
  region?: string;
  balancePatchVersion?: string;
  acceptDeadline?: string;
  readyAt?: string;
  connectingAt?: string;
  inProgressAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  updatedAt?: string;
  winner?: 'radiant' | 'dire';
  radiantScore?: number;
  direScore?: number;
  durationSeconds?: number;
  playersAccepted?: number;
  acceptedPlayers?: number;
};

export type OpsMatchPlayer = {
  playerId: string;
  steamId64?: string;
  personaName: string;
  team: 'radiant' | 'dire';
  primaryRole: string;
  ratingBefore?: number;
  ratingAfter?: number;
  trustScoreBefore?: number;
  trustScoreAfter?: number;
  acceptStatus?: string;
  connectionStatus?: string;
  isBot?: boolean;
};

export type MatchDetails = {
  match: Match;
  acceptance: { accepted: number; required: number };
  teams: { radiant: OpsMatchPlayer[]; dire: OpsMatchPlayer[] };
};

export type GameSessionStatus = 'issued' | 'active' | 'result_pending' | 'completed' | 'expired' | 'revoked';
export type GameSessionPlayer = {
  playerId: string;
  steamId64?: string;
  personaName: string;
  team: 'radiant' | 'dire';
  role: string;
  rating?: number;
};
export type GameSessionResult = {
  resultId?: string;
  winner?: 'radiant' | 'dire';
  radiantScore?: number;
  direScore?: number;
  durationSeconds?: number;
  balancePatchVersion?: string;
  rosterSteamIds?: string[];
};
export type GameSession = {
  id: string;
  matchId?: string;
  status: GameSessionStatus;
  verificationMode: string;
  balancePatchVersion?: string;
  expectedRoster: GameSessionPlayer[];
  serverState?: string;
  serverMetadata?: JsonRecord;
  resultId?: string;
  result?: GameSessionResult;
  expiresAt?: string;
  bootstrappedAt?: string;
  lastHeartbeatAt?: string;
  resultSubmittedAt?: string;
  completedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  createdAt?: string;
  updatedAt?: string;
  rowVersion?: number;
};
export type GameSessionEvent = { eventId: string; type: string; payload: JsonRecord; createdAt?: string };
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
function adaptMatch(value: JsonRecord): Match {
  return {
    id: text(value.id) ?? text(value.matchId),
    matchId: text(value.matchId) ?? text(value.id),
    roomCode: text(value.roomCode),
    status: text(value.status),
    region: text(value.region),
    balancePatchVersion: text(value.balancePatchVersion),
    acceptDeadline: text(value.acceptDeadline),
    readyAt: text(value.readyAt),
    connectingAt: text(value.connectingAt),
    inProgressAt: text(value.inProgressAt),
    completedAt: text(value.completedAt),
    cancelledAt: text(value.cancelledAt),
    updatedAt: text(value.updatedAt),
    winner: value.winner === 'radiant' || value.winner === 'dire' ? value.winner : undefined,
    radiantScore: number(value.radiantScore),
    direScore: number(value.direScore),
    durationSeconds: number(value.durationSeconds),
    playersAccepted: number(value.playersAccepted),
    acceptedPlayers: number(value.acceptedPlayers),
  };
}

function adaptMatchPlayer(value: JsonRecord): OpsMatchPlayer | null {
  const playerId = text(value.playerId);
  const personaName = text(value.personaName);
  const team = value.team === 'radiant' || value.team === 'dire' ? value.team : undefined;
  if (!playerId || !personaName || !team) return null;
  return {
    playerId,
    steamId64: text(value.steamId64),
    personaName,
    team,
    primaryRole: text(value.primaryRole) ?? 'Unknown',
    ratingBefore: number(value.ratingBefore),
    ratingAfter: number(value.ratingAfter),
    trustScoreBefore: number(value.trustScoreBefore),
    trustScoreAfter: number(value.trustScoreAfter),
    acceptStatus: text(value.acceptStatus),
    connectionStatus: text(value.connectionStatus),
    isBot: typeof value.isBot === 'boolean' ? value.isBot : undefined,
  };
}

export const adaptMatches = (payload: unknown): Match[] => envelope(payload, 'matches', adaptMatch);

export function adaptMatchDetails(payload: unknown): MatchDetails | null {
  if (!isRecord(payload) || !isRecord(payload.match)) return null;
  const acceptance = isRecord(payload.acceptance) ? payload.acceptance : {};
  const teams = isRecord(payload.teams) ? payload.teams : {};
  const adaptTeam = (value: unknown) => Array.isArray(value)
    ? value.filter(isRecord).map(adaptMatchPlayer).filter((player): player is OpsMatchPlayer => player !== null)
    : [];
  return {
    match: adaptMatch(payload.match),
    acceptance: { accepted: number(acceptance.accepted) ?? 0, required: number(acceptance.required) ?? 0 },
    teams: { radiant: adaptTeam(teams.radiant), dire: adaptTeam(teams.dire) },
  };
}

function adaptGameSessionPlayer(value: JsonRecord): GameSessionPlayer | null {
  const playerId = text(value.playerId);
  const personaName = text(value.personaName);
  const team = value.team === 'radiant' || value.team === 'dire' ? value.team : undefined;
  if (!playerId || !personaName || !team) return null;
  return {
    playerId,
    steamId64: text(value.steamId64),
    personaName,
    team,
    role: text(value.role) ?? 'Unknown',
    rating: number(value.rating),
  };
}

function adaptGameResult(value: unknown): GameSessionResult | undefined {
  if (!isRecord(value)) return undefined;
  return {
    resultId: text(value.resultId),
    winner: value.winner === 'radiant' || value.winner === 'dire' ? value.winner : undefined,
    radiantScore: number(value.radiantScore),
    direScore: number(value.direScore),
    durationSeconds: number(value.durationSeconds),
    balancePatchVersion: text(value.balancePatchVersion),
    rosterSteamIds: Array.isArray(value.rosterSteamIds) ? value.rosterSteamIds.filter((item): item is string => typeof item === 'string') : undefined,
  };
}

export function adaptGameSession(payload: unknown): GameSession | null {
  if (!isRecord(payload)) return null;
  const value = isRecord(payload.gameSession) ? payload.gameSession : payload;
  const id = text(value.id);
  const matchId = text(value.matchId);
  const status = text(value.status);
  if (!id || !status || !['issued', 'active', 'result_pending', 'completed', 'expired', 'revoked'].includes(status)) return null;
  return {
    id,
    matchId,
    status: status as GameSessionStatus,
    verificationMode: text(value.verificationMode) ?? 'unverified_valve_hosted',
    balancePatchVersion: text(value.balancePatchVersion),
    expectedRoster: Array.isArray(value.expectedRoster)
      ? value.expectedRoster.filter(isRecord).map(adaptGameSessionPlayer).filter((player): player is GameSessionPlayer => player !== null)
      : [],
    serverState: text(value.serverState),
    serverMetadata: isRecord(value.serverMetadata) ? value.serverMetadata : undefined,
    resultId: text(value.resultId),
    result: adaptGameResult(value.result),
    expiresAt: text(value.expiresAt),
    bootstrappedAt: text(value.bootstrappedAt),
    lastHeartbeatAt: text(value.lastHeartbeatAt),
    resultSubmittedAt: text(value.resultSubmittedAt),
    completedAt: text(value.completedAt),
    revokedAt: text(value.revokedAt),
    revocationReason: text(value.revocationReason),
    createdAt: text(value.createdAt),
    updatedAt: text(value.updatedAt),
    rowVersion: number(value.rowVersion),
  };
}

export function adaptGameSessions(payload: unknown): GameSession[] {
  if (!isRecord(payload) || !Array.isArray(payload.gameSessions)) return [];
  return payload.gameSessions.map(adaptGameSession).filter((session): session is GameSession => session !== null);
}
export const adaptAudit = (p: unknown): AuditEntry[] => envelope(p, 'audit', v => ({ id: text(v.id), createdAt: text(v.createdAt), time: text(v.time), actor: text(v.actor), admin: text(v.admin), action: text(v.action), entity: text(v.entity), result: text(v.result) }));
export const adaptPatches = (p: unknown): Patch[] => envelope(p, 'patches', v => ({ id: text(v.id), version: text(v.version), name: text(v.name), status: text(v.status), releasedAt: text(v.releasedAt), createdAt: text(v.createdAt) }));
export const adaptPlayers = (p: unknown): Player[] => envelope(p, 'players', v => ({ id: text(v.id), steamId: text(v.steamId), personaName: text(v.personaName), displayName: text(v.displayName), trustScore: number(v.trustScore), status: text(v.status) }));
export function adaptFeatureFlags(payload: unknown): FeatureFlag[] {
  if (!isRecord(payload) || !Array.isArray(payload.featureFlags)) return [];
  return payload.featureFlags.filter(isRecord).flatMap(value => typeof value.key === 'string' ? [{ key: value.key, enabled: value.enabled === true, description: text(value.description), environment: text(value.environment), updatedAt: text(value.updatedAt) }] : []);
}
