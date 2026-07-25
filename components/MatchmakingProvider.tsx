'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Play, RotateCcw, ShieldAlert, Swords, WifiOff } from 'lucide-react';
import { useRuntimeConfig } from '@/components/useRuntimeConfig';
import { useLocale } from '@/components/LocaleProvider';
import type { MatchDetails, MatchPlayer, MatchStatus } from '@/lib/match-types';

type Phase = MatchStatus | 'empty' | 'loading' | 'offline' | 'unauthorized' | 'disabled' | 'error';
type Context = {
  phase: Phase;
  match: MatchDetails | null;
  regions: string[];
  selectedRoles: string[];
  steamAuthenticated: boolean | null;
  searchSeconds: number;
  acceptCountdown: number;
  busy: boolean;
  lastError: string;
  toggleRegion: (value: string) => void;
  toggleRole: (value: string) => void;
  startSearch: () => void;
  cancelSearch: () => void;
  acceptMatch: () => void;
  declineMatch: () => void;
  startConnection: () => void;
  connectionReady: () => void;
  refresh: () => void;
  reset: () => void;
  resetDemo: () => void;
};

type JsonRecord = Record<string, unknown>;
type QueueSnapshot = { status?: string; joinedAt?: string; roles?: string[]; primaryRole?: string; regions?: string[] };
type PlayerSnapshot = { steamId64?: string | null };
type StateSnapshot = { status: MatchStatus; match: MatchDetails | null; queue: QueueSnapshot | null; player: PlayerSnapshot | null };

const MatchmakingContext = createContext<Context | null>(null);
const validStatuses = new Set<MatchStatus>(['idle', 'searching', 'accepting', 'ready', 'connecting', 'in_progress', 'completed', 'cancelled']);
const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : undefined;
const validSteamId = (value: unknown): value is string => typeof value === 'string' && /^7656119\d{10}$/.test(value);

const asPlayers = (value: unknown, team: 'radiant' | 'dire'): MatchPlayer[] => Array.isArray(value)
  ? value.map((raw, index) => {
    const player = isRecord(raw) ? raw : {};
    return {
      id: String(player.id ?? player.playerId ?? `${team}-${index}`),
      steamId64: player.steamId64 as string | undefined,
      personaName: String(player.personaName ?? player.name ?? player.nickname ?? `Player ${index + 1}`),
      avatarUrl: player.avatarUrl as string | undefined,
      profileUrl: player.profileUrl as string | undefined,
      role: String(player.role ?? player.primaryRole ?? '—'),
      trustRating: Number(player.trustRating ?? player.rating ?? player.ratingBefore ?? 0),
      team,
      isBot: player.isBot === true,
      acceptStatus: String(player.acceptStatus ?? player.accept_status ?? 'pending') as MatchPlayer['acceptStatus'],
      connectionStatus: (player.isBot === true ? 'connected' : String(player.connectionStatus ?? player.connection_status ?? 'pending')) as MatchPlayer['connectionStatus'],
      ratingBefore: num(player.ratingBefore),
      ratingAfter: num(player.ratingAfter),
      trustScoreBefore: num(player.trustScoreBefore),
      trustScoreAfter: num(player.trustScoreAfter),
    };
  })
  : [];

export function normalizeMatchDetails(payload: unknown, id?: string): MatchDetails | null {
  if (!isRecord(payload)) return null;
  const raw = isRecord(payload.match) ? payload.match : payload;
  const teams = isRecord(payload.teams) ? payload.teams : isRecord(raw.teams) ? raw.teams : {};
  const players = Array.isArray(payload.players) ? payload.players : Array.isArray(raw.players) ? raw.players : [];
  const radiant = asPlayers(teams.radiant ?? raw.radiant ?? players.filter(item => isRecord(item) && String(item.team).toLowerCase() === 'radiant'), 'radiant');
  const dire = asPlayers(teams.dire ?? raw.dire ?? players.filter(item => isRecord(item) && String(item.team).toLowerCase() === 'dire'), 'dire');
  const acceptance = isRecord(payload.acceptance) ? payload.acceptance : {};
  const self = isRecord(payload.self) ? payload.self : {};
  const status = String(raw.status ?? payload.status ?? 'idle') as MatchStatus;
  return {
    id: String(raw.id ?? raw.matchId ?? id ?? ''),
    status: validStatuses.has(status) ? status : 'idle',
    roomCode: raw.roomCode as string | undefined,
    region: raw.region as string | undefined,
    teams: { radiant, dire },
    accepted: Number(acceptance.accepted ?? raw.accepted ?? raw.acceptedPlayers ?? [...radiant, ...dire].filter(player => player.acceptStatus === 'accepted').length),
    required: Number(acceptance.required ?? raw.required ?? raw.requiredPlayers ?? radiant.length + dire.length),
    acceptDeadline: (raw.acceptDeadline ?? raw.accept_deadline) as string | undefined,
    inProgressAt: raw.inProgressAt as string | undefined,
    completedAt: raw.completedAt as string | undefined,
    cancelledAt: raw.cancelledAt as string | undefined,
    winner: raw.winner as MatchDetails['winner'],
    radiantScore: num(raw.radiantScore),
    direScore: num(raw.direScore),
    durationSeconds: num(raw.durationSeconds ?? raw.duration),
    cancellationReason: (raw.cancellationReason ?? raw.reason) as string | undefined,
    cancellationCode: raw.cancellationCode as string | undefined,
    requeued: raw.requeued === true,
    currentPlayerId: (payload.playerId ?? raw.currentPlayerId ?? self.playerId) as string | undefined,
    timeline: Array.isArray(raw.timeline) ? raw.timeline as MatchDetails['timeline'] : undefined,
  };
}

function stateSnapshot(payload: unknown): StateSnapshot {
  const root = isRecord(payload) ? payload : {};
  const state = isRecord(root.state) ? root.state : root;
  const activePayload = state.activeMatch ?? root.activeMatch ?? state.match ?? root.match;
  const match = normalizeMatchDetails(activePayload);
  const queueRaw = isRecord(state.queue) ? state.queue : isRecord(root.queue) ? root.queue : null;
  const queue = queueRaw ? {
    status: typeof queueRaw.status === 'string' ? queueRaw.status : undefined,
    joinedAt: typeof queueRaw.joinedAt === 'string' ? queueRaw.joinedAt : undefined,
    roles: Array.isArray(queueRaw.roles) ? queueRaw.roles.filter((item): item is string => typeof item === 'string') : undefined,
    primaryRole: typeof queueRaw.primaryRole === 'string' ? queueRaw.primaryRole : undefined,
    regions: Array.isArray(queueRaw.regions) ? queueRaw.regions.filter((item): item is string => typeof item === 'string') : undefined,
  } : null;
  const playerRaw = isRecord(state.player) ? state.player : isRecord(root.player) ? root.player : null;
  const player = playerRaw ? { steamId64: typeof playerRaw.steamId64 === 'string' ? playerRaw.steamId64 : null } : null;
  const explicit = String(state.status ?? state.matchStatus ?? match?.status ?? '');
  const status = match?.status
    ?? (queue?.status === 'waiting' ? 'searching' : validStatuses.has(explicit as MatchStatus) ? explicit as MatchStatus : 'idle');
  return { status, match, queue, player };
}

export function statusFromState(payload: unknown): { status: MatchStatus; match: MatchDetails | null } {
  const snapshot = stateSnapshot(payload);
  return { status: snapshot.status, match: snapshot.match };
}

export function secondsUntil(deadline?: string, now = Date.now()) {
  return deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000)) : 0;
}

async function request(path: string, init: RequestInit = {}, signal?: AbortSignal) {
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    signal,
  });
  const raw = await response.text();
  let data: unknown = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}
  if (!response.ok) {
    const body = isRecord(data) ? data : {};
    const error = isRecord(body.error) ? body.error : {};
    throw Object.assign(new Error(String(error.code ?? body.code ?? body.message ?? 'REQUEST_FAILED')), { status: response.status });
  }
  return data;
}

export function MatchmakingProvider({ children }: { children: React.ReactNode }) {
  const [regions, setRegions] = useState(['EU West']);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Mid']);
  const [steamAuthenticated, setSteamAuthenticated] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [acceptCountdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastError, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const refreshVersion = useRef(0);
  const actionLock = useRef(false);
  const config = useRuntimeConfig();

  useEffect(() => {
    try {
      const savedRegions = JSON.parse(localStorage.getItem('trust-regions') || '[]');
      if (Array.isArray(savedRegions) && savedRegions.length) setRegions(savedRegions.slice(0, 3));
      const savedRoles = JSON.parse(localStorage.getItem('trust-roles') || '[]');
      if (Array.isArray(savedRoles) && savedRoles.length) setSelectedRoles(savedRoles.slice(0, 5));
      else {
        const legacyRole = localStorage.getItem('trust-primary-role');
        if (legacyRole) setSelectedRoles([legacyRole]);
      }
    } catch {}
    localStorage.removeItem('trust-secondary-role');
  }, []);

  useEffect(() => {
    if (!config) return;
    const enabledRegions = new Set(config.regions.filter((item) => item.enabled).map((item) => item.name));
    const enabledRoles = new Set(config.roles.filter((item) => item.enabled).map((item) => item.name));
    setRegions((current) => {
      const migrated = current.map((item) => item === 'NA' ? 'US East' : item);
      const filtered = [...new Set(migrated.filter((item) => enabledRegions.has(item)))].slice(0, 3);
      const next = filtered.length ? filtered : [config.regions.find((item) => item.enabled)?.name ?? 'EU West'];
      if (next.length === current.length && next.every((item, index) => item === current[index])) return current;
      localStorage.setItem('trust-regions', JSON.stringify(next));
      return next;
    });
    setSelectedRoles((current) => {
      const filtered = [...new Set(current.filter((item) => enabledRoles.has(item)))].slice(0, 5);
      const next = filtered.length ? filtered : [config.roles.find((item) => item.enabled)?.name ?? 'Mid'];
      if (next.length === current.length && next.every((item, index) => item === current[index])) return current;
      localStorage.setItem('trust-roles', JSON.stringify(next));
      return next;
    });
  }, [config]);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    try {
      const payload = await request('/api/backend/me/state', {}, nextController.signal);
      if (version !== refreshVersion.current) return;
      const next = stateSnapshot(payload);
      setSteamAuthenticated(validSteamId(next.player?.steamId64));
      setPhase(next.status);
      setMatch(next.match);
      setError('');
      if (next.status === 'searching') {
        const joined = next.queue?.joinedAt ? new Date(next.queue.joinedAt).getTime() : Date.now();
        const safeJoined = Number.isFinite(joined) ? joined : Date.now();
        setSearchStartedAt(safeJoined);
        setSearchSeconds(Math.max(0, Math.floor((Date.now() - safeJoined) / 1000)));
        if (next.queue?.regions?.length) setRegions(next.queue.regions.slice(0, 3));
        const restoredRoles = next.queue?.roles?.length ? next.queue.roles : next.queue?.primaryRole ? [next.queue.primaryRole] : [];
        if (restoredRoles.length) setSelectedRoles(restoredRoles.slice(0, 5));
      } else if (['idle', 'cancelled', 'completed'].includes(next.status)) {
        setSearchStartedAt(null);
        setSearchSeconds(0);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError' || version !== refreshVersion.current) return;
      const status = (error as { status?: number }).status;
      setError(error instanceof Error ? error.message : 'REQUEST_FAILED');
      setPhase(status === 401 ? 'unauthorized' : 'offline');
      if (status === 401) setSteamAuthenticated(false);
      setSearchStartedAt(null);
      setSearchSeconds(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => controller.current?.abort();
  }, [refresh]);

  useEffect(() => {
    if (phase !== 'searching' || searchStartedAt === null) return;
    const tick = () => setSearchSeconds(Math.max(0, Math.floor((Date.now() - searchStartedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [phase, searchStartedAt]);

  useEffect(() => {
    if (phase !== 'accepting') return;
    const tick = () => setCountdown(secondsUntil(match?.acceptDeadline));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [phase, match?.acceptDeadline]);

  useEffect(() => {
    if (!['searching', 'accepting', 'ready', 'connecting', 'in_progress'].includes(phase)) return;
    let timer: number | undefined;
    const schedule = () => {
      if (document.hidden) return;
      timer = window.setTimeout(async () => {
        await refresh();
        schedule();
      }, ['accepting', 'ready', 'connecting'].includes(phase) ? 1500 : 4000);
    };
    const visible = () => {
      if (!document.hidden) {
        if (timer) window.clearTimeout(timer);
        void refresh().finally(schedule);
      } else if (timer) window.clearTimeout(timer);
    };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    schedule();
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [phase, refresh]);

  const action = async (path: string, body: unknown = {}): Promise<string | null> => {
    if (actionLock.current) return 'ACTION_IN_PROGRESS';
    actionLock.current = true;
    setBusy(true);
    setError('');
    try {
      await request(path, { method: 'POST', body: JSON.stringify(body) });
      await refresh();
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'REQUEST_FAILED';
      setError(message);
      return message;
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const toggleRegion = (value: string) => setRegions((current) => {
    const next = current.includes(value) ? current.filter((item) => item !== value) : current.length < 3 ? [...current, value] : current;
    if (!next.length) return current;
    localStorage.setItem('trust-regions', JSON.stringify(next));
    return next;
  });

  const toggleRole = (value: string) => setSelectedRoles((current) => {
    const next = current.includes(value) ? current.filter((item) => item !== value) : current.length < 5 ? [...current, value] : current;
    if (!next.length) return current;
    localStorage.setItem('trust-roles', JSON.stringify(next));
    localStorage.removeItem('trust-primary-role');
    return next;
  });

  const startSearch = async () => {
    if (actionLock.current) return;
    if (steamAuthenticated !== true) {
      setError('STEAM_ACCOUNT_REQUIRED');
      setPhase('unauthorized');
      return;
    }
    const enabledRegions = config?.regions.filter((item) => item.enabled).map((item) => item.name) ?? ['EU West', 'EU East', 'US East', 'US West', 'SEA'];
    const enabledRoles = config?.roles.filter((item) => item.enabled).map((item) => item.name) ?? ['Carry', 'Mid', 'Offlane', 'Soft Support', 'Hard Support'];
    const queueRegions = [...new Set(regions.map((item) => item === 'NA' ? 'US East' : item).filter((item) => enabledRegions.includes(item)))].slice(0, 3);
    const queueRoles = [...new Set(selectedRoles.filter((item) => enabledRoles.includes(item)))].slice(0, 5);
    if (!queueRoles.length || !queueRegions.length) {
      setError('QUEUE_SELECTION_REQUIRED');
      setPhase('error');
      return;
    }
    if (config && (!config.matchmaking.enabled || !config.featureFlags.matchmaking_enabled?.enabled || !config.featureFlags.play_button_enabled?.enabled)) {
      setPhase('disabled');
      return;
    }
    refreshVersion.current += 1;
    controller.current?.abort();
    setMatch(null);
    setSearchStartedAt(Date.now());
    setSearchSeconds(0);
    setPhase('loading');
    const error = await action('/api/backend/queue/join', { regions: queueRegions, roles: queueRoles });
    if (error) {
      setSearchStartedAt(null);
      setSearchSeconds(0);
      setPhase(error === 'STEAM_ACCOUNT_REQUIRED' || error === 'UNAUTHORIZED' ? 'unauthorized' : 'error');
      if (error === 'STEAM_ACCOUNT_REQUIRED') setSteamAuthenticated(false);
    }
  };

  const cancelSearch = async () => {
    if (actionLock.current) return;
    refreshVersion.current += 1;
    controller.current?.abort();
    setSearchStartedAt(null);
    setSearchSeconds(0);
    const error = await action('/api/backend/queue/cancel');
    if (!error) {
      setMatch(null);
      setPhase('idle');
    } else {
      await refresh();
    }
  };

  const acceptMatch = () => { if (match) void action(`/api/backend/matches/${match.id}/accept`); };
  const declineMatch = () => { if (match && confirm('Decline this match? / Отклонить матч?')) void action(`/api/backend/matches/${match.id}/decline`); };
  const startConnection = () => { if (match) void action(`/api/backend/matches/${match.id}/connection/start`); };
  const connectionReady = () => { if (match) void action(`/api/backend/matches/${match.id}/connection/ready`); };
  const reset = () => {
    refreshVersion.current += 1;
    controller.current?.abort();
    setMatch(null);
    setSearchStartedAt(null);
    setSearchSeconds(0);
    setError('');
    setPhase('idle');
  };
  const resetDemo = () => { if (phase === 'searching') void cancelSearch(); else reset(); };

  return (
    <MatchmakingContext.Provider value={{
      phase, match, regions, selectedRoles, steamAuthenticated, searchSeconds, acceptCountdown, busy, lastError,
      toggleRegion, toggleRole, startSearch, cancelSearch, acceptMatch, declineMatch, startConnection,
      connectionReady, refresh, reset, resetDemo,
    }}>
      {children}
      <Overlay/>
    </MatchmakingContext.Provider>
  );
}

export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (!context) throw new Error('useMatchmaking must be used inside MatchmakingProvider');
  return context;
}

export function formatTime(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function Overlay() {
  const context = useMatchmaking();
  const { locale } = useLocale();
  const ru = locale === 'ru';
  if (context.phase === 'idle' || context.phase === 'empty') return null;
  if (context.phase === 'loading') return <Bar><Loader2 className="animate-spin motion-reduce:animate-none"/><b>{ru ? 'Проверка очереди…' : 'Checking queue…'}</b></Bar>;
  if (context.phase === 'searching') return <Bar><Loader2 className="animate-spin motion-reduce:animate-none"/><b>{ru ? 'Поиск' : 'Searching'} · {formatTime(context.searchSeconds)}</b><button disabled={context.busy} onClick={context.cancelSearch}>{ru ? 'Отмена' : 'Cancel'}</button></Bar>;
  if (context.phase === 'unauthorized') return <Bar><ShieldAlert/><span>{ru ? 'Для поиска войдите через Steam.' : 'Sign in with Steam to start matchmaking.'}</span><a className="primary" href="/api/backend/auth/steam/start">{ru ? 'Войти' : 'Sign in'}</a></Bar>;
  if (context.phase === 'offline') return <Bar><WifiOff/><span>{ru ? 'Нет сети. Состояние восстановится автоматически.' : 'Offline. State will recover automatically.'}</span><button onClick={context.refresh}>{ru ? 'Повторить' : 'Retry'}</button></Bar>;
  if (!context.match) return <Bar><ShieldAlert/><span>{context.lastError || context.phase}</span><button onClick={context.refresh}>{ru ? 'Повторить' : 'Retry'}</button></Bar>;
  const match = context.match;
  if (context.phase === 'accepting') return <Modal live title={ru ? 'Матч найден' : 'Match Found'}><p className="text-center text-zinc-300">{match.roomCode || match.id} · {match.region || '—'} · {context.acceptCountdown}s · {match.accepted}/{match.required}</p><Teams match={match}/><button disabled={context.busy} onClick={context.acceptMatch} className="primary">{ru ? 'Принять' : 'Accept'}</button><button disabled={context.busy} onClick={context.declineMatch}>{ru ? 'Отклонить' : 'Decline'}</button></Modal>;
  if (context.phase === 'ready' || context.phase === 'connecting') return <Modal title={context.phase === 'ready' ? (ru ? 'Все подтвердили' : 'Everyone accepted') : (ru ? 'Готовность TRUST lobby' : 'TRUST lobby readiness')}><Teams match={match}/><Connections match={match}/><div className="flex flex-wrap gap-3"><button disabled={context.busy} className="primary" onClick={context.startConnection}>{ru ? 'Начать подключение' : 'Start connection'}</button><button disabled={context.busy} onClick={context.connectionReady}>{ru ? 'Я подключён' : 'I am connected'}</button><a href="steam://rungameid/570" className="rounded-xl border border-white/20 p-3"><Play className="inline"/> Dota 2</a></div><p className="text-sm text-zinc-400">{ru ? 'Проверяется готовность TRUST lobby; создание официального сервера Dota не подтверждено.' : 'TRUST lobby readiness is being checked; an official Dota server is not asserted.'}</p></Modal>;
  if (context.phase === 'in_progress') return <Bar><Swords/><div><b>{ru ? 'Идёт матч' : 'In Progress'} · {match.roomCode} · {match.region}</b><p>{match.inProgressAt ? formatTime(Math.max(0, Math.floor((Date.now() - new Date(match.inProgressAt).getTime()) / 1000))) : '—'}</p></div></Bar>;
  if (context.phase === 'completed') return <Result match={match} reset={context.reset} ru={ru}/>;
  if (context.phase === 'cancelled') return <Modal title={ru ? 'Матч отменён' : 'Match cancelled'}><p>{match.cancellationReason || match.cancellationCode || '—'}</p><p>{match.requeued ? (ru ? 'Вы возвращены в очередь' : 'Returned to queue') : (ru ? 'Вы не возвращены в очередь' : 'Not returned to queue')}</p><button className="primary" onClick={context.reset}>{ru ? 'Вернуться к очереди' : 'Back to queue'}</button></Modal>;
  return <Bar><ShieldAlert/><span>{context.lastError || context.phase}</span><button onClick={context.refresh}>{ru ? 'Повторить' : 'Retry'}</button></Bar>;
}

function Bar({ children }: { children: React.ReactNode }) {
  return <div aria-live="polite" className="fixed bottom-4 left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-trust-panel/95 p-4 shadow-glow">{children}</div>;
}
function Modal({ children, title, live = false }: { children: React.ReactNode; title: string; live?: boolean }) {
  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-live={live ? 'assertive' : 'polite'} className="my-auto grid max-h-[95vh] w-full max-w-4xl gap-5 overflow-y-auto rounded-3xl border border-white/10 bg-trust-panel p-5 shadow-glow"><h2 className="text-3xl font-black">{title}</h2>{children}</section></div>;
}
function Teams({ match }: { match: MatchDetails }) {
  return <div className="grid gap-4 md:grid-cols-2">{(['radiant', 'dire'] as const).map((side) => <div key={side}><h3 className="mb-2 text-xl font-black capitalize text-trust-soft">{side}</h3>{match.teams[side].map((player) => <div key={player.id} className="mb-2 flex items-center gap-3 rounded-xl bg-black/25 p-3"><img src={player.avatarUrl || '/avatar-fallback.svg'} alt="" className="h-9 w-9 rounded-full"/><span className="min-w-0 flex-1 truncate">{player.personaName}<small className="block text-zinc-400">{player.role}</small></span><b>{player.trustRating || '—'}</b><span>{player.acceptStatus}</span></div>)}</div>)}</div>;
}
function Connections({ match }: { match: MatchDetails }) {
  return <ul>{[...match.teams.radiant, ...match.teams.dire].map((player) => <li className="flex justify-between py-1" key={player.id}><span>{player.personaName}</span><span className={player.connectionStatus === 'failed' ? 'text-rose-300' : 'text-zinc-300'}>{player.connectionStatus}</span></li>)}</ul>;
}
function Result({ match, reset, ru }: { match: MatchDetails; reset: () => void; ru: boolean }) {
  const self = [...match.teams.radiant, ...match.teams.dire].find((player) => player.id === match.currentPlayerId);
  const won = Boolean(self && self.team === match.winner);
  const delta = (before?: number, after?: number) => before === undefined || after === undefined ? '—' : `${after - before >= 0 ? '+' : ''}${after - before}`;
  return <Modal title={won ? (ru ? 'Победа' : 'Victory') : (ru ? 'Поражение' : 'Defeat')}><p className="text-3xl font-black">Radiant {match.radiantScore ?? '—'} : {match.direScore ?? '—'} Dire</p><p>{ru ? 'Победитель' : 'Winner'}: {match.winner || '—'} · {ru ? 'Длительность' : 'Duration'}: {match.durationSeconds === undefined ? '—' : formatTime(match.durationSeconds)}</p>{self && <div className="grid gap-2 sm:grid-cols-2"><p>TRUST Rating: {self.ratingBefore ?? '—'} → {self.ratingAfter ?? '—'} ({delta(self.ratingBefore, self.ratingAfter)})</p><p>Trust Score: {self.trustScoreBefore ?? '—'} → {self.trustScoreAfter ?? '—'} ({delta(self.trustScoreBefore, self.trustScoreAfter)})</p></div>}<p className="text-zinc-400">{ru ? 'Изменения рассчитаны сервером по результату матча и поведению.' : 'Changes are calculated by the server from match result and behavior.'}</p><button className="primary" onClick={reset}><RotateCcw className="inline"/> {ru ? 'Играть снова' : 'Play again'}</button></Modal>;
}
