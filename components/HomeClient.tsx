'use client';

import { Activity, Clock, Loader2, Play, Radar, RotateCcw, Sparkles, Users, XCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, Pill, Shell } from '@/components/Shell';
import { dire, matches, radiant, regions, roles, stats } from '@/lib/data';

type Step = 'idle' | 'searching' | 'found' | 'accepted' | 'connecting' | 'completed' | 'error';

const connection = ['Connected', 'Connected', 'Connecting', 'Connected', 'Waiting'];

export default function HomeClient() {
  const [role, setRole] = useState('Mid');
  const [region, setRegion] = useState('EU West');
  const [step, setStep] = useState<Step>('idle');
  const [seconds, setSeconds] = useState(0);
  const [accepted, setAccepted] = useState(0);

  useEffect(() => {
    setRole(localStorage.getItem('trust-role') || 'Mid');
    setRegion(localStorage.getItem('trust-region') || 'EU West');
  }, []);

  useEffect(() => localStorage.setItem('trust-role', role), [role]);
  useEffect(() => localStorage.setItem('trust-region', region), [region]);

  useEffect(() => {
    if (step !== 'searching') return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    const found = window.setTimeout(() => setStep('found'), 4500);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(found);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'accepted') return undefined;
    const timer = window.setInterval(() => setAccepted((value) => Math.min(value + 1, 10)), 550);
    const next = window.setTimeout(() => setStep('connecting'), 3600);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(next);
    };
  }, [step]);

  useEffect(() => {
    if (step !== 'connecting') return undefined;
    const done = window.setTimeout(() => setStep('completed'), 3800);
    return () => window.clearTimeout(done);
  }, [step]);

  const time = useMemo(() => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, [seconds]);
  const canStart = Boolean(role && region);

  function startSearch() {
    if (!canStart) {
      setStep('error');
      return;
    }
    setSeconds(0);
    setAccepted(0);
    setStep('searching');
  }

  function reset() {
    setSeconds(0);
    setAccepted(0);
    setStep('idle');
  }

  return (
    <Shell>
      <div className="space-y-8">
        <section id="home" className="grid items-center gap-8 py-10 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-7">
            <Pill><Sparkles className="mr-1 inline" size={14} /> Interactive Season One demo</Pill>
            <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">Competitive Dota 2 with <span className="text-gradient">verified trust</span>.</h1>
            <p className="max-w-2xl text-lg text-zinc-300">Выберите роль и регион, запустите поиск, примите матч и посмотрите полный демо-флоу TRUST до экрана завершённой игры.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#queue" className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-trust-violet px-8 py-4 text-lg font-black shadow-glow transition hover:scale-[1.02] hover:bg-trust-glow"><Play className="fill-white" /> Play</a>
              <Link href="/leaderboard" className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-center font-bold text-zinc-200 transition hover:-translate-y-1 hover:bg-white/10">Leaderboard</Link>
            </div>
          </div>
          <Card className="animate-float"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-zinc-400">Live queue</p><h2 className="text-3xl font-black">Prime 5v5</h2></div><Activity className="text-trust-soft" /></div><div className="grid grid-cols-2 gap-3">{stats.map((s) => <div className="rounded-2xl bg-trust-panel/70 p-4 transition hover:bg-white/10" key={s.label}><p className="text-xs text-zinc-500">{s.label}</p><p className="mt-1 text-2xl font-black">{s.value}</p><p className="text-xs text-trust-soft">{s.delta}</p></div>)}</div></Card>
        </section>

        <section id="queue" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2"><div className="mb-6 flex items-center gap-3"><Radar className="text-trust-soft" /><h2 className="text-3xl font-black">Role & region</h2></div><p className="mb-3 text-sm text-zinc-400">Choose role</p><div className="grid gap-3 sm:grid-cols-5">{roles.map((item) => <button onClick={() => setRole(item)} className={`rounded-2xl border p-4 text-sm font-bold transition hover:-translate-y-1 ${role === item ? 'border-trust-soft bg-trust-violet/30 shadow-glow' : 'border-white/10 bg-white/5 hover:bg-white/10'}`} key={item}>{item}</button>)}</div><p className="mb-3 mt-6 text-sm text-zinc-400">Region</p><div className="flex flex-wrap gap-3">{regions.map((item) => <button onClick={() => setRegion(item)} className={`rounded-full px-5 py-2 text-sm font-bold transition hover:scale-105 ${region === item ? 'bg-white text-trust-black' : 'bg-white/5 text-zinc-300'}`} key={item}>{item}</button>)}</div></Card>
          <Card id="scenario"><p className="text-zinc-400">Scenario status</p><h3 className="mt-2 text-4xl font-black">{step === 'searching' ? time : step === 'idle' ? 'Ready' : step.toUpperCase()}</h3><p className="mt-4 text-sm text-zinc-400">Selected: <b className="text-white">{role || 'empty role'}</b> · <b className="text-white">{region || 'empty region'}</b></p><div className="mt-6 flex gap-3"><button onClick={startSearch} disabled={step === 'searching'} className="flex-1 rounded-2xl bg-trust-violet py-4 font-black shadow-glow transition hover:bg-trust-glow disabled:cursor-wait disabled:opacity-60">{step === 'searching' ? 'Searching...' : 'Start queue'}</button><button onClick={reset} className="rounded-2xl border border-white/10 px-4 transition hover:bg-white/10"><RotateCcw /></button></div></Card>
        </section>

        <DemoStage accepted={accepted} role={role} region={region} step={step} time={time} onAccept={() => setStep('accepted')} onError={() => setStep('error')} onReset={reset} />

        <section id="patch"><Card><Zap className="mb-4 text-trust-soft" /><h2 className="text-3xl font-black">Active TRUST Patch</h2><p className="mt-3 text-zinc-300">Patch 1.04: stricter smurf signals, role-performance MMR, faster remake votes and improved behavior weighting for high-rank lobbies.</p></Card></section>
      </div>
    </Shell>
  );
}

function DemoStage({ accepted, role, region, step, time, onAccept, onError, onReset }: { accepted: number; role: string; region: string; step: Step; time: string; onAccept: () => void; onError: () => void; onReset: () => void }) {
  if (step === 'idle') return <StateCard icon={<Clock />} title="Empty state" text="Очередь ещё не запущена. Выберите роль/регион и нажмите Start queue." />;
  if (step === 'searching') return <StateCard spinning icon={<Loader2 />} title="Searching match" text={`Идёт поиск в ${region} на роли ${role}. Таймер: ${time}.`} />;
  if (step === 'error') return <StateCard icon={<XCircle />} title="Queue error" text="Не удалось запустить очередь: выберите роль и регион." action="Reset" onAction={onReset} />;
  if (step === 'found') return <Card><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><Pill>Match found</Pill><h2 className="mt-3 text-4xl font-black">TRUST Room #8842</h2><p className="mt-2 text-zinc-400">Captain mode · {region} · selected role {role}</p></div><button onClick={onAccept} className="animate-pulseGlow rounded-2xl bg-gradient-to-r from-trust-violet to-trust-glow px-10 py-5 text-xl font-black transition hover:scale-105">Accept</button></div><button onClick={onError} className="mt-4 text-sm text-zinc-500 underline hover:text-rose-300">simulate error</button></Card>;
  if (step === 'accepted') return <Card><h2 className="text-3xl font-black">Accept status</h2><div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-trust-violet to-trust-soft transition-all" style={{ width: `${accepted * 10}%` }} /></div><p className="mt-3 text-zinc-300">{accepted}/10 players accepted. Формируем составы...</p></Card>;
  if (step === 'connecting') return <Card><h2 className="mb-5 text-3xl font-black">Teams & connection</h2><div className="grid gap-4 lg:grid-cols-2"><Team title="Radiant" names={radiant} /><Team title="Dire" names={dire} /></div></Card>;
  return <Card><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div><Pill>Completed match</Pill><h2 className="mt-3 text-4xl font-black">Radiant Victory</h2><p className="mt-2 text-zinc-400">42:18 · TRUST Rating +27 · Trust Score unchanged</p><button onClick={onReset} className="mt-6 rounded-2xl bg-white px-6 py-3 font-black text-trust-black transition hover:bg-trust-soft">Play again</button></div><div>{matches.slice(0, 3).map((match) => <div className="mb-3 grid gap-2 rounded-2xl bg-white/5 p-4 sm:grid-cols-5" key={match.id}><b>{match.hero}</b><span className="text-zinc-400">{match.mode}</span><span className={match.result === 'Victory' ? 'text-emerald-300' : 'text-rose-300'}>{match.result}</span><span>{match.score}</span><span className="text-right text-trust-soft">{match.rating}</span></div>)}</div></div></Card>;
}

function StateCard({ action, icon, spinning, text, title, onAction }: { action?: string; icon: React.ReactNode; spinning?: boolean; text: string; title: string; onAction?: () => void }) {
  return <Card><div className="flex items-center gap-4"><span className={`grid h-14 w-14 place-items-center rounded-2xl bg-trust-violet/20 text-trust-soft ${spinning ? 'animate-spin' : ''}`}>{icon}</span><div><h2 className="text-3xl font-black">{title}</h2><p className="mt-1 text-zinc-400">{text}</p></div></div>{action && <button onClick={onAction} className="mt-5 rounded-2xl bg-white px-5 py-3 font-bold text-trust-black">{action}</button>}</Card>;
}

function Team({ title, names }: { title: string; names: string[] }) {
  return <div><h4 className="mb-3 flex items-center gap-2 font-black"><Users size={16} />{title}</h4>{names.map((name, i) => <div className="mb-2 flex items-center justify-between rounded-xl bg-black/25 p-3 text-sm transition hover:bg-white/10" key={name}><span>{name}</span><span className="text-zinc-500">{roles[i]}</span><span className={connection[i] === 'Connected' ? 'text-emerald-300' : connection[i] === 'Connecting' ? 'text-trust-soft' : 'text-zinc-500'}>{connection[i]}</span></div>)}</div>;
}
