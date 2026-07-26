'use client';

import {
  Activity,
  CheckCircle2,
  Clipboard,
  Gamepad2,
  Radio,
  RefreshCw,
  ShieldCheck,
  Terminal,
  TimerReset,
  Users,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adaptGameSession,
  adaptGameSessions,
  adaptMatchDetails,
  adaptMatches,
  isRecord,
  loadJson,
  type GameSession,
  type GameSessionEvent,
  type Match,
  type MatchDetails,
} from '@/lib/ops-api';

type BackendInfo = { apiBaseUrl: string; addonId: string };
type IssuedSecret = {
  sessionId: string;
  token: string;
  bootstrapPath: string;
};

const activeMatchStates = new Set(['ready', 'connecting', 'in_progress']);

export default function GameSessionsPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [diagnosticSessions, setDiagnosticSessions] = useState<GameSession[]>([]);
  const [diagnosticSteamId64, setDiagnosticSteamId64] = useState('');
  const [diagnosticPersonaName, setDiagnosticPersonaName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [session, setSession] = useState<GameSession | null>(null);
  const [events, setEvents] = useState<GameSessionEvent[]>([]);
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [issuedSecret, setIssuedSecret] = useState<IssuedSecret | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadMatches = useCallback(async () => {
    const payload = await loadJson('/api/admin/matches');
    const next = adaptMatches(payload).filter(match => activeMatchStates.has(match.status ?? '')).sort((a, b) => matchPriority(a.status) - matchPriority(b.status));
    setMatches(next);
    setSelectedMatchId(current => {
      if (current && next.some(match => match.id === current)) return current;
      return next[0]?.id ?? '';
    });
  }, []);

  const loadMatch = useCallback(async (matchId: string) => {
    const [detailsPayload, sessionsPayload] = await Promise.all([
      loadJson(`/api/admin/matches/${encodeURIComponent(matchId)}`),
      loadJson(`/api/admin/matches/${encodeURIComponent(matchId)}/game-session`),
    ]);
    setMatchDetails(adaptMatchDetails(detailsPayload));
    const nextSessions = adaptGameSessions(sessionsPayload);
    setSessions(nextSessions);
    setSelectedSessionId(current => current || nextSessions[0]?.id || '');
    setLastRefresh(new Date());
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    const payload = await loadJson(`/api/admin/game-sessions/${encodeURIComponent(sessionId)}`);
    const next = adaptGameSession(payload);
    setSession(next);
    setEvents(readEvents(payload));
    setLastRefresh(new Date());
  }, []);

  const loadDiagnosticSessions = useCallback(async () => {
    const payload = await loadJson('/api/admin/game-sessions/diagnostic');
    setDiagnosticSessions(adaptGameSessions(payload));
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      await Promise.all([loadMatches(), loadDiagnosticSessions()]);
      if (selectedMatchId) await loadMatch(selectedMatchId);
      if (selectedSessionId) await loadSession(selectedSessionId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load game sessions');
    }
  }, [loadDiagnosticSessions, loadMatch, loadMatches, loadSession, selectedMatchId, selectedSessionId]);

  useEffect(() => {
    void (async () => {
      try {
        const payload = await loadJson('/api/admin/game-server/config');
        if (isRecord(payload) && typeof payload.apiBaseUrl === 'string' && typeof payload.addonId === 'string') {
          setBackendInfo({ apiBaseUrl: payload.apiBaseUrl, addonId: payload.addonId });
        }
        await Promise.all([loadMatches(), loadDiagnosticSessions()]);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : 'Unable to load game sessions');
      }
    })();
  }, [loadDiagnosticSessions, loadMatches]);

  useEffect(() => {
    if (!selectedMatchId) {
      setMatchDetails(null);
      setSessions([]);
      return;
    }
    setError('');
    void loadMatch(selectedMatchId).catch(nextError => {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load match');
    });
  }, [loadMatch, selectedMatchId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSession(null);
      setEvents([]);
      return;
    }
    setError('');
    void loadSession(selectedSessionId).catch(nextError => {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load game session');
    });
  }, [loadSession, selectedSessionId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDiagnosticSessions().catch(() => undefined);
      if (selectedMatchId) void loadMatch(selectedMatchId).catch(() => undefined);
      if (selectedSessionId) void loadSession(selectedSessionId).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadDiagnosticSessions, loadMatch, loadSession, selectedMatchId, selectedSessionId]);

  async function issueDiagnosticSession() {
    setBusy('diagnostic');
    setError('');
    setNotice('');
    try {
      const payload = await loadJson('/api/admin/game-sessions/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steamId64: diagnosticSteamId64.trim(),
          personaName: diagnosticPersonaName.trim() || 'Diagnostic player',
          ttlSeconds: 900,
        }),
      });
      const next = adaptGameSession(payload);
      if (!next || !isRecord(payload) || typeof payload.token !== 'string') {
        throw new Error('Backend did not return the one-time diagnostic token');
      }
      setIssuedSecret({
        sessionId: next.id,
        token: payload.token,
        bootstrapPath: typeof payload.bootstrapPath === 'string'
          ? payload.bootstrapPath
          : '/v1/game-sessions/bootstrap',
      });
      setSession(next);
      setEvents([]);
      setSelectedSessionId(next.id);
      setDiagnosticSessions(current => [next, ...current.filter(item => item.id !== next.id)]);
      setNotice('Diagnostic session issued. It accepts heartbeat and events only; results and rating changes are blocked by the backend.');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to issue diagnostic session');
    } finally {
      setBusy('');
    }
  }

  async function issueSession() {
    if (!selectedMatchId) return;
    setBusy('issue');
    setError('');
    setNotice('');
    try {
      const payload = await loadJson(`/api/admin/matches/${encodeURIComponent(selectedMatchId)}/game-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlSeconds: 900 }),
      });
      const next = adaptGameSession(payload);
      if (!next || !isRecord(payload) || typeof payload.token !== 'string') {
        throw new Error('Backend did not return the one-time game token');
      }
      const secret = {
        sessionId: next.id,
        token: payload.token,
        bootstrapPath: typeof payload.bootstrapPath === 'string'
          ? payload.bootstrapPath
          : '/v1/game-sessions/bootstrap',
      };
      setIssuedSecret(secret);
      setSession(next);
      setSelectedSessionId(next.id);
      setNotice('Game session issued. Copy the launch packet now; the bearer token cannot be recovered later.');
      await loadMatch(selectedMatchId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to issue game session');
    } finally {
      setBusy('');
    }
  }

  async function confirmResult() {
    if (!session) return;
    setBusy('confirm');
    setError('');
    try {
      await loadJson(`/api/admin/game-sessions/${encodeURIComponent(session.id)}/confirm-result`, {
        method: 'POST',
      });
      setIssuedSecret(null);
      setNotice('Result confirmed. Rating, Trust Score, history, and audit were finalized by the backend.');
      await loadSession(session.id);
      if (selectedMatchId) await loadMatch(selectedMatchId);
      await loadMatches();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to confirm result');
    } finally {
      setBusy('');
    }
  }

  async function revokeSession() {
    if (!session || !revokeReason.trim()) return;
    setBusy('revoke');
    setError('');
    try {
      await loadJson(`/api/admin/game-sessions/${encodeURIComponent(session.id)}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason.trim() }),
      });
      setIssuedSecret(null);
      setRevokeReason('');
      setNotice('Game session revoked. Its bearer token can no longer report events or a result.');
      await loadSession(session.id);
      if (selectedMatchId) await loadMatch(selectedMatchId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to revoke session');
    } finally {
      setBusy('');
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setError('Clipboard permission was denied. Select the text and copy it manually.');
    }
  }

  const selectedMatch = matchDetails?.match ?? matches.find(match => match.id === selectedMatchId) ?? null;
  const canIssue = Boolean(selectedMatch && activeMatchStates.has(selectedMatch.status ?? ''));
  const allSessions = useMemo(() => {
    const byId = new Map<string, GameSession>();
    for (const item of [...diagnosticSessions, ...sessions]) byId.set(item.id, item);
    return [...byId.values()];
  }, [diagnosticSessions, sessions]);
  const launchPacket = useMemo(() => {
    if (!issuedSecret || !backendInfo || issuedSecret.sessionId !== session?.id) return '';
    return JSON.stringify({
      schemaVersion: '1',
      addonId: backendInfo.addonId,
      apiBaseUrl: backendInfo.apiBaseUrl,
      bootstrapPath: issuedSecret.bootstrapPath,
      gameSessionId: issuedSecret.sessionId,
      bearerToken: issuedSecret.token,
    }, null, 2);
  }, [backendInfo, issuedSecret, session?.id]);

  return <div className="grid gap-5">
    <section className="rounded-3xl border border-trust-soft/25 bg-gradient-to-r from-trust-violet/20 via-white/5 to-transparent p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-bold tracking-[.25em] text-trust-soft">VALVE-HOSTED CONTROL PLANE</p>
          <h2 className="mt-2 text-3xl font-black">Game Sessions</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Issue a scoped token for one accepted match, observe the Workshop server, and review its unverified result before ratings change.
          </p>
        </div>
        <button onClick={() => void refresh()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold transition hover:bg-white/10">
          <RefreshCw size={17}/> Refresh
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric icon={<Gamepad2/>} value={String(matches.filter(match => activeMatchStates.has(match.status ?? '')).length)} label="Eligible matches"/>
        <Metric icon={<Radio/>} value={String(sessions.filter(item => item.status === 'active').length)} label="Active sessions"/>
        <Metric icon={<TimerReset/>} value={String(sessions.filter(item => item.status === 'result_pending').length)} label="Pending results"/>
        <Metric icon={<Activity/>} value={lastRefresh ? lastRefresh.toLocaleTimeString() : '—'} label="Last refresh"/>
      </div>
    </section>

    {error && <Notice tone="error">{error}</Notice>}
    {notice && <Notice tone="success">{notice}</Notice>}

    <section className="rounded-3xl border border-cyan-300/20 bg-cyan-500/5 p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 shrink-0 text-cyan-300"/>
        <div>
          <p className="text-xs font-bold tracking-[.2em] text-cyan-200">SAFE LOCAL DIAGNOSTIC</p>
          <h3 className="mt-1 text-2xl font-black">One-player Railway session</h3>
          <p className="mt-2 max-w-3xl text-sm text-zinc-300">
            Use this only to verify addon bootstrap, heartbeat, roster visibility, and events. The backend rejects result submission and confirmation, so Rating and Trust Score cannot change.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <input
          value={diagnosticSteamId64}
          onChange={event => setDiagnosticSteamId64(event.target.value.replace(/\D/g, '').slice(0, 17))}
          placeholder="Steam ID64 (17 digits)"
          inputMode="numeric"
          className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
        />
        <input
          value={diagnosticPersonaName}
          onChange={event => setDiagnosticPersonaName(event.target.value)}
          placeholder="Display name (optional)"
          maxLength={100}
          className="rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
        />
        <button
          disabled={!/^7656119\d{10}$/.test(diagnosticSteamId64) || busy === 'diagnostic'}
          onClick={() => void issueDiagnosticSession()}
          className="rounded-2xl bg-cyan-300 px-6 py-3 font-black text-cyan-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === 'diagnostic' ? 'Issuing…' : 'Issue diagnostic token'}
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-500">Requires DIAGNOSTIC_GAME_SESSIONS_ENABLED=true on the Railway backend service.</p>
    </section>

    <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <label className="grid gap-2 text-sm font-bold text-zinc-300">
          Match
          <select value={selectedMatchId} onChange={event => {
            setSelectedMatchId(event.target.value);
            setSelectedSessionId('');
            setIssuedSecret(null);
          }} className="rounded-2xl border border-white/10 bg-zinc-950 p-3 text-white">
            <option value="">Select a match</option>
            {matches.map(match => <option key={match.id} value={match.id}>
              {match.roomCode ?? shortId(match.id)} · {match.status ?? 'unknown'} · {match.region ?? '—'}
            </option>)}
          </select>
        </label>
        {selectedMatch && <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Detail label="Status" value={selectedMatch.status ?? '—'}/>
          <Detail label="Room" value={selectedMatch.roomCode ?? '—'}/>
          <Detail label="Region" value={selectedMatch.region ?? '—'}/>
          <Detail label="Balance" value={selectedMatch.balancePatchVersion ?? 'unversioned'}/>
          <Detail label="Accepted" value={`${matchDetails?.acceptance.accepted ?? 0}/${matchDetails?.acceptance.required ?? 0}`}/>
          <Detail label="Match ID" value={shortId(selectedMatch.id)}/>
        </div>}
        <button
          disabled={!canIssue || busy === 'issue'}
          onClick={() => void issueSession()}
          className="mt-5 w-full rounded-2xl bg-trust-violet px-5 py-4 font-black shadow-glow transition hover:bg-trust-glow disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === 'issue' ? 'Issuing…' : sessions.some(item => ['issued', 'active', 'result_pending'].includes(item.status)) ? 'Revoke old & issue new token' : 'Issue game session'}
        </button>
        {!canIssue && selectedMatch && <p className="mt-3 text-xs text-amber-200">Issuance is available only for ready, connecting, or in-progress matches.</p>}
        <p className="mt-3 text-xs text-zinc-500">The backend also requires exactly 10 non-bot players with linked Steam ID64 accounts.</p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-xs font-bold tracking-[.2em] text-zinc-500">ONE-TIME SECRET</p><h3 className="text-xl font-black">Addon launch packet</h3></div>
          <Terminal className="text-trust-soft"/>
        </div>
        {launchPacket ? <>
          <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-3 text-sm text-amber-100">
            This token is visible only now. Never commit it to the addon or send it to players.
          </p>
          <textarea readOnly value={launchPacket} rows={11} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-zinc-200"/>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button onClick={() => void copy(launchPacket, 'Launch packet')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black text-black"><Clipboard size={17}/> Copy packet</button>
            <button onClick={() => void copy(issuedSecret?.token ?? '', 'Bearer token')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 font-bold"><ShieldCheck size={17}/> Copy token only</button>
          </div>
        </> : <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-400">
          Issue a game session to receive its token. Existing tokens are intentionally not recoverable; revoke and reissue if one was lost.
        </div>}
      </div>
    </section>

    <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div><p className="text-xs font-bold tracking-[.2em] text-zinc-500">SESSION HISTORY</p><h3 className="text-2xl font-black">Server status</h3></div>
        <select value={selectedSessionId} onChange={event => setSelectedSessionId(event.target.value)} className="rounded-2xl border border-white/10 bg-zinc-950 p-3 text-sm">
          <option value="">No session selected</option>
          {allSessions.map(item => <option key={item.id} value={item.id}>{item.verificationMode === 'development_diagnostic' ? 'diagnostic' : item.status} · {shortId(item.id)} · {formatTime(item.createdAt)}</option>)}
        </select>
      </div>
      {session ? <div className="mt-5 grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Detail label="Status" value={session.status} accent/>
          <Detail label="Verification" value={session.verificationMode}/>
          <Detail label="Server state" value={session.serverState ?? 'not reported'}/>
          <Detail label="Heartbeat" value={relativeTime(session.lastHeartbeatAt)}/>
          <Detail label="Expires" value={formatTime(session.expiresAt)}/>
        </div>

        {session.status === 'result_pending' && session.result && <div className="rounded-3xl border border-amber-300/25 bg-amber-500/10 p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-bold tracking-[.2em] text-amber-200">ADMIN REVIEW REQUIRED</p>
              <h4 className="mt-1 text-2xl font-black">{title(session.result.winner)} victory · {session.result.radiantScore}:{session.result.direScore}</h4>
              <p className="text-sm text-zinc-300">Duration {duration(session.result.durationSeconds)} · Result {session.resultId ?? '—'}</p>
            </div>
            <button disabled={busy === 'confirm'} onClick={() => void confirmResult()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 font-black text-emerald-950 disabled:opacity-50">
              <CheckCircle2 size={19}/> {busy === 'confirm' ? 'Confirming…' : 'Confirm & apply rating'}
            </button>
          </div>
        </div>}

        {!['completed', 'revoked'].includes(session.status) && <div className="grid gap-3 rounded-2xl border border-rose-300/15 bg-rose-950/20 p-4 md:grid-cols-[1fr_auto]">
          <input value={revokeReason} onChange={event => setRevokeReason(event.target.value)} placeholder="Reason for revocation" className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm"/>
          <button disabled={!revokeReason.trim() || busy === 'revoke'} onClick={() => void revokeSession()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/30 px-5 py-3 font-bold text-rose-200 disabled:opacity-40">
            <XCircle size={17}/> Revoke token
          </button>
        </div>}
      </div> : <p className="mt-5 rounded-2xl border border-dashed border-white/15 p-8 text-center text-zinc-400">This match has no game sessions yet.</p>}
    </section>

    {session && <TeamRoster session={session} fallback={matchDetails}/>}
    {session && <EventTimeline events={events}/>}
  </div>;
}

function TeamRoster({ session, fallback }: { session: GameSession; fallback: MatchDetails | null }) {
  const roster = session.expectedRoster.length ? session.expectedRoster : [
    ...(fallback?.teams.radiant ?? []),
    ...(fallback?.teams.dire ?? []),
  ].map(player => ({
    playerId: player.playerId,
    steamId64: player.steamId64,
    personaName: player.personaName,
    team: player.team,
    role: player.primaryRole,
    rating: player.ratingBefore,
  }));
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
    <div className="flex items-center gap-3"><Users className="text-trust-soft"/><h3 className="text-2xl font-black">Pinned roster</h3><span className="text-sm text-zinc-500">{roster.length}/{session.verificationMode === 'development_diagnostic' ? 1 : 10}</span></div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      {(['radiant', 'dire'] as const).map(team => <div key={team}>
        <p className={`mb-3 text-sm font-black uppercase tracking-[.2em] ${team === 'radiant' ? 'text-emerald-300' : 'text-rose-300'}`}>{team}</p>
        <div className="grid gap-2">{roster.filter(player => player.team === team).map(player => <div key={player.playerId} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl bg-black/30 p-3 text-sm">
          <div><p className="font-bold">{player.personaName}</p><p className="text-xs text-zinc-500">{player.steamId64 ?? 'Steam ID missing'}</p></div>
          <div className="text-right"><p>{player.role}</p><p className="text-xs text-trust-soft">{player.rating ?? '—'} rating</p></div>
        </div>)}</div>
      </div>)}
    </div>
  </section>;
}

function EventTimeline({ events }: { events: GameSessionEvent[] }) {
  return <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
    <div className="flex items-center gap-3"><Activity className="text-trust-soft"/><h3 className="text-2xl font-black">Event timeline</h3></div>
    <div className="mt-5 grid gap-2">{events.length ? events.map(event => <div key={event.eventId} className="grid gap-2 rounded-2xl bg-black/30 p-3 text-sm md:grid-cols-[180px_180px_1fr]">
      <span className="text-zinc-500">{formatTime(event.createdAt)}</span>
      <b>{event.type}</b>
      <code className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-zinc-400">{JSON.stringify(event.payload)}</code>
    </div>) : <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-zinc-400">No addon events received yet.</p>}</div>
  </section>;
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><span className="text-trust-soft">{icon}</span><p className="mt-2 text-2xl font-black">{value}</p><p className="text-xs text-zinc-400">{label}</p></div>;
}

function Detail({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="rounded-2xl bg-black/25 p-3"><p className="text-xs text-zinc-500">{label}</p><p className={`mt-1 break-words font-bold ${accent ? 'text-trust-soft' : ''}`}>{value}</p></div>;
}

function Notice({ children, tone }: { children: React.ReactNode; tone: 'error' | 'success' }) {
  return <p role="alert" className={`rounded-2xl border p-4 text-sm ${tone === 'error' ? 'border-rose-300/25 bg-rose-950/50 text-rose-100' : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'}`}>{children}</p>;
}

function readEvents(payload: unknown): GameSessionEvent[] {
  if (!isRecord(payload) || !Array.isArray(payload.events)) return [];
  return payload.events.flatMap(value => {
    if (!isRecord(value) || typeof value.event_id !== 'string' || typeof value.type !== 'string') return [];
    return [{
      eventId: value.event_id,
      type: value.type,
      payload: isRecord(value.payload) ? value.payload : {},
      createdAt: typeof value.created_at === 'string' ? value.created_at : undefined,
    }];
  });
}

function matchPriority(status?: string) {
  return ({ in_progress: 0, connecting: 1, ready: 2, accepting: 3, completed: 4, cancelled: 5 } as Record<string, number>)[status ?? ''] ?? 9;
}

function shortId(value?: string) {
  return value ? `${value.slice(0, 8)}…` : '—';
}

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function relativeTime(value?: string) {
  if (!value) return 'never';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function duration(seconds?: number) {
  if (!seconds) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function title(value?: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown';
}
