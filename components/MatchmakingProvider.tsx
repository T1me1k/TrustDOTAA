'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Play, RotateCcw, ShieldAlert, Swords, X } from 'lucide-react';
import { dire, radiant, regions, roles } from '@/lib/data';

type MatchPhase = 'empty' | 'searching' | 'found' | 'accepted' | 'draft' | 'connecting' | 'ready' | 'completed' | 'error';

type MatchmakingContextValue = {
  acceptCountdown: number;
  acceptedPlayers: number;
  cancelSearch: () => void;
  launchDota: () => void;
  phase: MatchPhase;
  primaryRole: string;
  region: string;
  resetDemo: () => void;
  searchSeconds: number;
  secondaryRole: string;
  setPrimaryRole: (role: string) => void;
  setRegion: (region: string) => void;
  setSecondaryRole: (role: string) => void;
  startSearch: () => void;
  acceptMatch: () => void;
};

const MatchmakingContext = createContext<MatchmakingContextValue | null>(null);
const players = [...radiant, ...dire];

export function MatchmakingProvider({ children }: { children: React.ReactNode }) {
  const [region, setRegionState] = useState('EU West');
  const [primaryRole, setPrimaryRoleState] = useState('Mid');
  const [secondaryRole, setSecondaryRoleState] = useState('Soft Support');
  const [phase, setPhase] = useState<MatchPhase>('empty');
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [acceptCountdown, setAcceptCountdown] = useState(10);
  const [acceptedPlayers, setAcceptedPlayers] = useState(0);

  useEffect(() => {
    setRegionState(localStorage.getItem('trust-region') || 'EU West');
    setPrimaryRoleState(localStorage.getItem('trust-primary-role') || localStorage.getItem('trust-role') || 'Mid');
    setSecondaryRoleState(localStorage.getItem('trust-secondary-role') || 'Soft Support');
  }, []);

  function setRegion(value: string) {
    setRegionState(value);
    localStorage.setItem('trust-region', value);
  }

  function setPrimaryRole(value: string) {
    setPrimaryRoleState(value);
    localStorage.setItem('trust-primary-role', value);
    localStorage.setItem('trust-role', value);
  }

  function setSecondaryRole(value: string) {
    setSecondaryRoleState(value);
    localStorage.setItem('trust-secondary-role', value);
  }

  function startSearch() {
    if (!region || !primaryRole || !secondaryRole || primaryRole === secondaryRole) {
      setPhase('error');
      return;
    }
    setSearchSeconds(0);
    setAcceptCountdown(10);
    setAcceptedPlayers(0);
    setPhase('searching');
  }

  function cancelSearch() {
    setSearchSeconds(0);
    setAcceptCountdown(10);
    setAcceptedPlayers(0);
    setPhase('empty');
  }

  function acceptMatch() {
    setAcceptedPlayers(1);
    setPhase('accepted');
  }

  function launchDota() {
    setPhase('completed');
  }

  function resetDemo() {
    setSearchSeconds(0);
    setAcceptCountdown(10);
    setAcceptedPlayers(0);
    setPhase('empty');
  }

  useEffect(() => {
    if (phase !== 'searching') return undefined;
    const timer = window.setInterval(() => setSearchSeconds((value) => value + 1), 1000);
    const found = window.setTimeout(() => setPhase('found'), 4500);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(found);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'found') return undefined;
    const countdown = window.setInterval(() => setAcceptCountdown((value) => Math.max(value - 1, 0)), 1000);
    const timeout = window.setTimeout(() => setPhase('error'), 10000);
    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(timeout);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'accepted') return undefined;
    const acceptTimer = window.setInterval(() => setAcceptedPlayers((value) => Math.min(value + 1, 10)), 420);
    const draft = window.setTimeout(() => setPhase('draft'), 4300);
    return () => {
      window.clearInterval(acceptTimer);
      window.clearTimeout(draft);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'draft') return undefined;
    const connecting = window.setTimeout(() => setPhase('connecting'), 4200);
    return () => window.clearTimeout(connecting);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'connecting') return undefined;
    const ready = window.setTimeout(() => setPhase('ready'), 4500);
    return () => window.clearTimeout(ready);
  }, [phase]);

  const value = useMemo(
    () => ({ acceptCountdown, acceptedPlayers, cancelSearch, launchDota, phase, primaryRole, region, resetDemo, searchSeconds, secondaryRole, setPrimaryRole, setRegion, setSecondaryRole, startSearch, acceptMatch }),
    [acceptCountdown, acceptedPlayers, phase, primaryRole, region, searchSeconds, secondaryRole],
  );

  return (
    <MatchmakingContext.Provider value={value}>
      {children}
      <GlobalMatchOverlay />
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

function GlobalMatchOverlay() {
  const { acceptCountdown, acceptMatch, acceptedPlayers, cancelSearch, launchDota, phase, primaryRole, region, resetDemo, searchSeconds, secondaryRole } = useMatchmaking();

  if (phase === 'empty') return null;

  if (phase === 'searching') {
    return (
      <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border border-white/10 bg-trust-panel/90 p-4 shadow-glow backdrop-blur-2xl md:bottom-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><Loader2 className="animate-spin text-trust-soft" /><div><p className="font-black">Searching match · {formatTime(searchSeconds)}</p><p className="text-sm text-zinc-400">{region} · {primaryRole} / {secondaryRole}</p></div></div>
          <button onClick={cancelSearch} className="rounded-2xl border border-white/10 px-5 py-3 font-bold transition hover:border-rose-300/50 hover:bg-rose-500/10 hover:text-rose-200">Cancel</button>
        </div>
      </div>
    );
  }

  if (phase === 'found') {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg">
        <div className="w-full max-w-lg animate-pulseGlow rounded-[2rem] border border-trust-soft/40 bg-trust-panel/95 p-7 text-center shadow-glow">
          <Swords className="mx-auto mb-4 text-trust-soft" size={44} />
          <p className="text-sm uppercase tracking-[.35em] text-trust-soft">Match Found</p>
          <h2 className="mt-2 text-4xl font-black">TRUST Room #8842</h2>
          <p className="mt-3 text-zinc-400">Accept in {acceptCountdown}s · {region} · {primaryRole} / {secondaryRole}</p>
          <button onClick={acceptMatch} className="mt-7 w-full rounded-3xl bg-gradient-to-r from-trust-violet to-trust-glow py-5 text-2xl font-black transition hover:scale-[1.02]">Accept</button>
          <button onClick={cancelSearch} className="mt-3 text-sm text-zinc-500 transition hover:text-white">Decline</button>
        </div>
      </div>
    );
  }

  if (phase === 'accepted') {
    return <FloatingStatus title="Accept status" subtitle={`${acceptedPlayers}/10 players accepted`} progress={acceptedPlayers * 10} />;
  }

  if (phase === 'draft') {
    return <MatchRoom />;
  }

  if (phase === 'connecting') {
    return <FloatingStatus title="Connecting players" subtitle="Preparing local Dota lobby demo" progress={85} />;
  }

  if (phase === 'ready') {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-trust-panel/95 p-7 text-center shadow-glow">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-300" size={44} />
          <h2 className="text-4xl font-black">Players connected</h2>
          <p className="mt-3 text-zinc-400">Demo lobby is ready. No real Steam API is connected.</p>
          <button onClick={launchDota} className="mt-7 inline-flex items-center justify-center gap-3 rounded-3xl bg-white px-8 py-4 font-black text-trust-black transition hover:bg-trust-soft"><Play className="fill-trust-black" /> Launch Dota</button>
        </div>
      </div>
    );
  }

  if (phase === 'completed') {
    return (
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg">
        <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-trust-panel/95 p-7 shadow-glow">
          <p className="text-sm uppercase tracking-[.35em] text-trust-soft">Match completed</p>
          <div className="mt-3 grid gap-5 md:grid-cols-[1fr_auto] md:items-end"><div><h2 className="text-5xl font-black text-gradient">Radiant Victory</h2><p className="mt-2 text-zinc-400">Score 43–31 · Duration 42:18 · Room #8842</p></div><div className="rounded-2xl bg-white/5 p-4 text-right"><p className="text-emerald-300">Rating +27</p><p className="text-trust-soft">Trust Score +2</p></div></div>
          <button onClick={resetDemo} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-trust-violet px-6 py-3 font-black transition hover:bg-trust-glow"><RotateCcw size={18} /> Reset demo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border border-rose-300/30 bg-rose-950/90 p-4 shadow-glow backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><ShieldAlert className="text-rose-200" /><div><p className="font-black">Matchmaking error</p><p className="text-sm text-rose-100/70">Choose different primary and secondary roles, then try again.</p></div></div><button onClick={resetDemo} className="rounded-2xl bg-white px-4 py-2 font-bold text-trust-black"><X /></button></div>
    </div>
  );
}

function FloatingStatus({ progress, subtitle, title }: { progress: number; subtitle: string; title: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-3xl border border-white/10 bg-trust-panel/90 p-4 shadow-glow backdrop-blur-2xl md:bottom-8">
      <p className="font-black">{title}</p>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-trust-violet to-trust-soft transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
    </div>
  );
}

function MatchRoom() {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-lg">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-white/10 bg-trust-panel/95 p-5 shadow-glow md:p-7">
        <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><p className="text-sm uppercase tracking-[.35em] text-trust-soft">Match Room</p><h2 className="text-4xl font-black">Radiant vs Dire</h2></div><p className="text-zinc-400">Teams, roles and ratings are mock data.</p></div>
        <div className="grid gap-4 lg:grid-cols-2"><Team title="Radiant" names={radiant} offset={0} /><Team title="Dire" names={dire} offset={5} /></div>
      </div>
    </div>
  );
}

function Team({ names, offset, title }: { names: string[]; offset: number; title: string }) {
  return <div><h3 className="mb-3 text-xl font-black text-trust-soft">{title}</h3>{names.map((name, index) => <div className="mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl bg-black/25 p-3 text-sm transition hover:bg-white/10" key={name}><span className="font-bold">{name}</span><span className="text-zinc-400">{roles[index]}</span><span className="font-black">{2840 - (index + offset) * 33}</span></div>)}</div>;
}
