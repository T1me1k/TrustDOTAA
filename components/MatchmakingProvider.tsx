'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Play, RotateCcw, ShieldAlert, Swords, X } from 'lucide-react';
import { useRuntimeConfig } from '@/components/useRuntimeConfig';

type MatchPhase = 'empty' | 'loading' | 'searching' | 'found' | 'accepted' | 'draft' | 'connecting' | 'ready' | 'completed' | 'offline' | 'unauthorized' | 'disabled' | 'timeout' | 'error';
type Player = { name?: string; nickname?: string; role?: string; rating?: number; status?: string; team?: string };
type Match = { id?: string; roomId?: string; status?: string; acceptedPlayers?: number; requiredPlayers?: number; teams?: { radiant?: Player[]; dire?: Player[] }; radiant?: Player[]; dire?: Player[] };

type MatchmakingContextValue = { acceptCountdown: number; acceptedPlayers: number; cancelSearch: () => void; launchDota: () => void; phase: MatchPhase; primaryRole: string; regions: string[]; resetDemo: () => void; searchSeconds: number; setPrimaryRole: (role: string) => void; toggleRegion: (region: string) => void; startSearch: () => void; acceptMatch: () => void; declineMatch: () => void; lastError: string; match: Match | null };
const MatchmakingContext = createContext<MatchmakingContextValue | null>(null);

function normalizeMatchDetails(data: { match?: Match; players?: Player[] } & Match, matchId?: string): Match {
  const base = data.match || data;
  const teams = data.players?.reduce<{ radiant: Player[]; dire: Player[] }>((result, player) => {
    const team = String(player.team || '').toLowerCase();
    (team === 'dire' ? result.dire : result.radiant).push(player);
    return result;
  }, { radiant: [], dire: [] });
  return { ...base, id: base.id || matchId, ...(teams ? { teams } : {}) };
}

async function api(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(path, { ...init, cache: 'no-store', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, signal: controller.signal });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw Object.assign(new Error(data.error?.message || data.error || data.message || res.statusText), { status: res.status });
    return data;
  } finally { window.clearTimeout(timeout); }
}

export function MatchmakingProvider({ children }: { children: React.ReactNode }) {
  const [regions, setRegions] = useState<string[]>(['EU West']);
  const [primaryRole, setPrimaryRoleState] = useState('Mid');
  const [phase, setPhase] = useState<MatchPhase>('empty');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [acceptCountdown, setAcceptCountdown] = useState(10);
  const [acceptedPlayers, setAcceptedPlayers] = useState(0);
  const [match, setMatch] = useState<Match | null>(null);
  const [lastError, setLastError] = useState('');
  const runtimeConfig = useRuntimeConfig();

  useEffect(() => { const saved=localStorage.getItem('trust-regions'); if(saved) { try { const values=JSON.parse(saved); if(Array.isArray(values)&&values.length) setRegions(values.slice(0,3)); } catch {} } localStorage.removeItem('trust-secondary-role'); localStorage.removeItem('trust-region'); setPrimaryRoleState(localStorage.getItem('trust-primary-role') || 'Mid'); }, []);
  function toggleRegion(value: string) { setRegions(current => { const next=current.includes(value)?current.filter(v=>v!==value):current.length<3?[...current,value]:current; if(!next.length)return current; localStorage.setItem('trust-regions',JSON.stringify(next)); return next; }); }
  function setPrimaryRole(value: string) { setPrimaryRoleState(value); localStorage.setItem('trust-primary-role', value); }
  function fail(error: unknown) { const status = (error as { status?: number }).status; setLastError(error instanceof Error ? error.message : 'Server error'); setPhase(status === 401 ? 'unauthorized' : status === 403 ? 'disabled' : error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : status === 502 ? 'offline' : 'error'); }
  async function ensureGuest() { const data = await api('/api/backend/me'); if (!data.player && data.guestAllowed !== false) await api('/api/backend/auth/guest', { method: 'POST', body: JSON.stringify({}) }); }
  async function startSearch() { if (!runtimeConfig?.matchmaking?.enabled || !runtimeConfig?.featureFlags.matchmaking_enabled?.enabled || !runtimeConfig?.featureFlags.play_button_enabled?.enabled) return setPhase('disabled'); setPhase('loading'); setLastError(''); setSearchSeconds(0); setMatch(null); try { await ensureGuest(); await api('/api/backend/queue/join', { method: 'POST', body: JSON.stringify({ regions, primaryRole }) }); setPhase('searching'); } catch (e) { fail(e); } }
  async function cancelSearch() { try { await api('/api/backend/queue/cancel', { method: 'POST', body: JSON.stringify({ matchId: match?.id }) }); } catch {} setSearchSeconds(0); setAcceptCountdown(runtimeConfig?.matchmaking?.acceptTimerSeconds || 10); setAcceptedPlayers(0); setMatch(null); setPhase('empty'); }
  async function acceptMatch() { if (!match?.id) return; try { const matchId = match.id; await api(`/api/backend/matches/${matchId}/accept`, { method: 'POST', body: JSON.stringify({}) }); const details = await api(`/api/backend/matches/${matchId}`); const next = normalizeMatchDetails(details, matchId); setMatch(next); setAcceptedPlayers(next.acceptedPlayers || 1); setPhase('accepted'); } catch (e) { fail(e); } }
  async function declineMatch() { if (match?.id) { try { await api(`/api/backend/matches/${match.id}/decline`, { method: 'POST', body: JSON.stringify({}) }); } catch {} } await cancelSearch(); }
  function launchDota() { window.location.href = 'steam://rungameid/570'; }
  function resetDemo() { setSearchSeconds(0); setAcceptCountdown(runtimeConfig?.matchmaking?.acceptTimerSeconds || 10); setAcceptedPlayers(0); setMatch(null); setLastError(''); setPhase('empty'); }

  useEffect(() => { if (phase !== 'searching') return; const tick = window.setInterval(() => setSearchSeconds((v) => v + 1), 1000); const poll = window.setInterval(async () => { try { const data = await api('/api/backend/queue/status'); if (data.match || data.matchId) { const matchId = data.matchId || data.match?.id; const found = data.match && !data.players ? data : await api(`/api/backend/matches/${matchId}`); const next = normalizeMatchDetails(found, matchId); setMatch(next); setAcceptedPlayers(next.acceptedPlayers || 0); setAcceptCountdown(found.acceptTimerSeconds || runtimeConfig?.matchmaking?.acceptTimerSeconds || 10); setPhase('found'); } } catch (e) { fail(e); } }, 2500); return () => { window.clearInterval(tick); window.clearInterval(poll); }; }, [phase, runtimeConfig?.matchmaking?.acceptTimerSeconds]);
  useEffect(() => { if (phase !== 'found') return; const countdown = window.setInterval(() => setAcceptCountdown((value) => { if (value <= 1) { setPhase('timeout'); return 0; } return value - 1; }), 1000); return () => window.clearInterval(countdown); }, [phase]);
  useEffect(() => { if (phase !== 'accepted') return; const poll = window.setInterval(async () => { if (!match?.id) return; try { const data = await api(`/api/backend/matches/${match.id}`); const next = normalizeMatchDetails(data, match.id); setMatch(next); setAcceptedPlayers(next.acceptedPlayers || 1); if (['draft','connecting','ready'].includes(String(next.status))) setPhase(next.status as MatchPhase); } catch (e) { fail(e); } }, 2500); return () => window.clearInterval(poll); }, [phase, match?.id]);

  return <MatchmakingContext.Provider value={{ acceptCountdown, acceptedPlayers, cancelSearch, launchDota, phase, primaryRole, regions, resetDemo, searchSeconds, setPrimaryRole, toggleRegion, startSearch, acceptMatch, declineMatch, lastError, match }}>{children}<GlobalMatchOverlay /></MatchmakingContext.Provider>;
}
export function useMatchmaking() { const context = useContext(MatchmakingContext); if (!context) throw new Error('useMatchmaking must be used inside MatchmakingProvider'); return context; }
export function formatTime(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function GlobalMatchOverlay() { const { acceptCountdown, acceptMatch, acceptedPlayers, cancelSearch, declineMatch, launchDota, lastError, match, phase, primaryRole, regions, resetDemo, searchSeconds } = useMatchmaking();
  if (phase === 'empty') return null; if (phase === 'loading' || phase === 'searching') return <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border border-white/10 bg-trust-panel/90 p-4 shadow-glow backdrop-blur-2xl md:bottom-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Loader2 className="animate-spin text-trust-soft"/><div><p className="font-black">{phase === 'loading' ? 'Authorizing…' : `Searching match · ${formatTime(searchSeconds)}`}</p><p className="text-sm text-zinc-400">{regions.join(', ')} · {primaryRole}</p></div></div><button onClick={cancelSearch} className="rounded-2xl border border-white/10 px-5 py-3 font-bold transition hover:border-rose-300/50 hover:bg-rose-500/10 hover:text-rose-200">Cancel</button></div></div>;
  if (phase === 'found') return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg"><div className="w-full max-w-lg animate-pulseGlow rounded-[2rem] border border-trust-soft/40 bg-trust-panel/95 p-7 text-center shadow-glow"><Swords className="mx-auto mb-4 text-trust-soft" size={44}/><p className="text-sm uppercase tracking-[.35em] text-trust-soft">Match Found</p><h2 className="mt-2 text-4xl font-black">TRUST Room #{match?.roomId || match?.id || 'pending'}</h2><p className="mt-3 text-zinc-400">Accept in {acceptCountdown}s · {regions.join(', ')} · {primaryRole}</p><button onClick={acceptMatch} className="mt-7 w-full rounded-3xl bg-gradient-to-r from-trust-violet to-trust-glow py-5 text-2xl font-black transition hover:scale-[1.02]">Accept</button><button onClick={declineMatch} className="mt-3 text-sm text-zinc-500 transition hover:text-white">Decline</button></div></div>;
  if (phase === 'accepted') return <FloatingStatus title="Accept status" subtitle={`${acceptedPlayers}/${match?.requiredPlayers || 10} players accepted`} progress={acceptedPlayers * 10}/>; if (phase === 'draft') return <MatchRoom match={match}/>; if (phase === 'connecting') return <FloatingStatus title="Connecting players" subtitle="Preparing Dota lobby" progress={85}/>; if (phase === 'ready') return <Ready launchDota={launchDota}/>; if (phase === 'completed') return <Completed resetDemo={resetDemo}/>; return <ErrorBox phase={phase} message={lastError} resetDemo={resetDemo}/>; }
function FloatingStatus({ progress, subtitle, title }: { progress: number; subtitle: string; title: string }) { return <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border border-white/10 bg-trust-panel/90 p-4 shadow-glow backdrop-blur-2xl md:bottom-8"><p className="font-black">{title}</p><div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-trust-violet to-trust-soft transition-all duration-500" style={{ width: `${progress}%` }}/></div><p className="mt-2 text-sm text-zinc-400">{subtitle}</p></div>; }
function MatchRoom({ match }: { match: Match | null }) { const radiant = match?.teams?.radiant || match?.radiant || []; const dire = match?.teams?.dire || match?.dire || []; return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-trust-panel/95 p-5 shadow-glow md:p-7"><div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-sm uppercase tracking-[.35em] text-trust-soft">Match Room</p><h2 className="text-4xl font-black">Radiant vs Dire</h2></div><p className="text-zinc-400">Teams, roles, ratings and statuses are loaded from backend.</p></div><div className="grid gap-4 lg:grid-cols-2"><Team title="Radiant" players={radiant}/><Team title="Dire" players={dire}/></div></div></div>; }
function Team({ players, title }: { players: Player[]; title: string }) { return <div><h3 className="mb-3 text-xl font-black text-trust-soft">{title}</h3>{players.map((p, i) => <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-2xl bg-black/25 p-3 text-sm transition hover:bg-white/10" key={`${title}-${i}`}><span className="font-bold">{p.name || p.nickname || `Player ${i + 1}`}</span><span className="text-zinc-400">{p.role || 'Role'}</span><span className="font-black">{p.rating || '—'}</span><span className="text-trust-soft">{p.status || 'ready'}</span></div>)}</div>; }
function Ready({ launchDota }: { launchDota: () => void }) { return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg"><div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-trust-panel/95 p-7 text-center shadow-glow"><CheckCircle2 className="mx-auto mb-4 text-emerald-300" size={44}/><h2 className="text-4xl font-black">Players connected</h2><p className="mt-3 text-zinc-400">Lobby is ready.</p><button onClick={launchDota} className="mt-7 inline-flex items-center justify-center gap-3 rounded-3xl bg-white px-8 py-4 font-black text-trust-black transition hover:bg-trust-soft"><Play className="fill-trust-black"/> Launch Dota</button></div></div>; }
function Completed({ resetDemo }: { resetDemo: () => void }) { return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg"><div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-trust-panel/95 p-7 shadow-glow"><p className="text-sm uppercase tracking-[.35em] text-trust-soft">Match completed</p><h2 className="mt-3 text-5xl font-black text-gradient">Game finished</h2><button onClick={resetDemo} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-trust-violet px-6 py-3 font-black transition hover:bg-trust-glow"><RotateCcw size={18}/> Reset demo</button></div></div>; }
function ErrorBox({ message, phase, resetDemo }: { message: string; phase: string; resetDemo: () => void }) { return <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border border-rose-300/30 bg-rose-950/90 p-4 shadow-glow backdrop-blur-2xl"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><ShieldAlert className="text-rose-200"/><div><p className="font-black">Matchmaking {phase}</p><p className="text-sm text-rose-100/70">{message || 'Please try again later.'}</p></div></div><button onClick={resetDemo} className="rounded-2xl bg-white px-4 py-2 font-bold text-trust-black"><X/></button></div></div>; }
