'use client';

import { Activity, Menu, Play, Radar, Shield, Sparkles, Trophy, Users, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { heroes, leaderboard, matches, player, radiant, regions, roles, stats } from '@/lib/data';

function Card({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`glass rounded-3xl p-5 md:p-7 ${className}`}>{children}</section>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-trust-soft/25 bg-trust-violet/10 px-3 py-1 text-xs text-trust-soft">{children}</span>;
}

function Nav() {
  const [open, setOpen] = useState(false);
  const links = ['Queue', 'Profile', 'Matches', 'Leaderboard', 'Patch'];
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-trust-black/75 backdrop-blur-xl">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
      <a href="#home" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-trust-violet shadow-glow"><Shield size={22}/></span><span className="text-xl font-black tracking-[.25em]">TRUST</span></a>
      <div className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">{links.map(l => <a className="transition hover:text-white" key={l} href={`#${l.toLowerCase()}`}>{l}</a>)}</div>
      <button className="hidden rounded-full bg-white px-5 py-2 text-sm font-bold text-trust-black transition hover:bg-trust-soft md:block">Connect Steam</button>
      <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    </nav>
    {open && <div className="grid gap-3 border-t border-white/10 px-4 py-4 md:hidden">{links.map(l => <a onClick={() => setOpen(false)} className="rounded-2xl bg-white/5 p-3" key={l} href={`#${l.toLowerCase()}`}>{l}</a>)}</div>}
  </header>;
}

export default function TrustUI() {
  const [role, setRole] = useState('Mid');
  const [region, setRegion] = useState('EU West');
  return <main className="min-h-screen overflow-hidden bg-trust-black bg-radial-trust text-white">
    <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:64px_64px]" />
    <Nav />
    <div className="relative mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <section id="home" className="grid items-center gap-8 py-10 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-7">
          <Pill><Sparkles className="mr-1 inline" size={14}/> Season One beta is live</Pill>
          <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">Dota 2 matchmaking built on <span className="text-gradient">skill, trust and pressure</span>.</h1>
          <p className="max-w-2xl text-lg text-zinc-300">TRUST combines FACEIT-style competitive hubs, verified player reputation, strict role queues and premium match rooms for serious Dota 2 players.</p>
          <div className="flex flex-col gap-3 sm:flex-row"><a href="#queue" className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-trust-violet px-8 py-4 text-lg font-black shadow-glow transition hover:scale-[1.02] hover:bg-trust-glow"><Play className="fill-white"/> Play</a><a href="#leaderboard" className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-center font-bold text-zinc-200 hover:bg-white/10">View leaderboard</a></div>
        </div>
        <Card className="animate-float"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-zinc-400">Live queue</p><h2 className="text-3xl font-black">Prime 5v5</h2></div><Activity className="text-trust-soft"/></div><div className="grid grid-cols-2 gap-3">{stats.map(s => <div className="rounded-2xl bg-trust-panel/70 p-4" key={s.label}><p className="text-xs text-zinc-500">{s.label}</p><p className="mt-1 text-2xl font-black">{s.value}</p><p className="text-xs text-trust-soft">{s.delta}</p></div>)}</div></Card>
      </section>

      <section id="queue" className="grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-2"><div className="mb-6 flex items-center gap-3"><Radar className="text-trust-soft"/><h2 className="text-3xl font-black">Match queue</h2></div><p className="mb-3 text-sm text-zinc-400">Choose role</p><div className="grid gap-3 sm:grid-cols-5">{roles.map(r => <button onClick={() => setRole(r)} className={`rounded-2xl border p-4 text-sm font-bold transition ${role === r ? 'border-trust-soft bg-trust-violet/30 shadow-glow' : 'border-white/10 bg-white/5 hover:bg-white/10'}`} key={r}>{r}</button>)}</div><p className="mb-3 mt-6 text-sm text-zinc-400">Region</p><div className="flex flex-wrap gap-3">{regions.map(r => <button onClick={() => setRegion(r)} className={`rounded-full px-5 py-2 text-sm font-bold ${region === r ? 'bg-white text-trust-black' : 'bg-white/5 text-zinc-300'}`} key={r}>{r}</button>)}</div></Card><Card><p className="text-zinc-400">Ready check</p><h3 className="mt-2 text-4xl font-black">01:12</h3><p className="mt-4 text-sm text-zinc-400">Searching as <b className="text-white">{role}</b> in <b className="text-white">{region}</b>.</p><button className="mt-6 w-full rounded-2xl bg-trust-violet py-4 font-black shadow-glow">Start queue</button></Card></section>

      <section id="profile" className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><Card><div className="flex items-center gap-4"><div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-trust-violet to-trust-soft text-3xl font-black">VL</div><div><h2 className="text-3xl font-black">{player.name}</h2><p className="text-trust-soft">{player.rank}</p></div></div><div className="mt-7 grid grid-cols-2 gap-3">{[['TRUST Rating', player.rating], ['Trust Score', player.trustScore], ['Win Rate', player.winRate], ['KDA', player.kda]].map(([k,v]) => <div className="rounded-2xl bg-white/5 p-4" key={k}><p className="text-xs text-zinc-500">{k}</p><p className="text-2xl font-black">{v}</p></div>)}</div></Card><Card><h3 className="mb-4 text-2xl font-black">Favorite heroes</h3>{heroes.map(h => <div className="mb-3 flex items-center justify-between rounded-2xl bg-trust-panel/70 p-4" key={h.name}><span className="font-bold">{h.name}</span><span className="text-sm text-zinc-400">{h.games} games · <b className="text-trust-soft">{h.wr}</b></span></div>)}</Card></section>

      <section id="matches" className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]"><Card><h2 className="mb-5 text-3xl font-black">Match history</h2>{matches.map(m => <div className="mb-3 grid gap-2 rounded-2xl bg-white/5 p-4 sm:grid-cols-6 sm:items-center" key={m.id}><b>{m.hero}</b><span className="text-zinc-400">{m.mode}</span><span className={m.result === 'Victory' ? 'text-emerald-300' : 'text-rose-300'}>{m.result}</span><span>{m.score}</span><span className={m.rating.startsWith('+') ? 'text-emerald-300' : 'text-rose-300'}>{m.rating}</span><span className="text-sm text-zinc-500">{m.time}</span></div>)}</Card><Card id="match"><h2 className="mb-3 text-3xl font-black">Match found</h2><p className="text-zinc-400">TRUST Room #8842 · Captain mode</p><button className="my-5 w-full animate-pulseGlow rounded-2xl bg-gradient-to-r from-trust-violet to-trust-glow py-4 font-black">Accept</button><div className="grid gap-3 sm:grid-cols-2"><Team title="Radiant" names={radiant}/><Team title="Dire" names={radiant.map((_, i) => ['LotusMind','SmokeCore','RoshanByte','HexNova','RuneShift'][i])}/></div></Card></section>

      <section id="leaderboard" className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><Card id="patch"><Zap className="mb-4 text-trust-soft"/><h2 className="text-3xl font-black">Active TRUST Patch</h2><p className="mt-3 text-zinc-300">Patch 1.04: stricter smurf signals, role-performance MMR, faster remake votes and improved behavior weighting for high-rank lobbies.</p></Card><Card><div className="mb-5 flex items-center gap-3"><Trophy className="text-trust-soft"/><h2 className="text-3xl font-black">Leaderboard</h2></div>{leaderboard.map(p => <div className="mb-3 grid grid-cols-4 items-center rounded-2xl bg-white/5 p-4" key={p.name}><span className="font-black text-trust-soft">#{p.place}</span><span className="font-bold">{p.name}</span><span className="text-zinc-400">{p.region}</span><span className="text-right font-black">{p.rating}</span></div>)}</Card></section>
    </div>
  </main>;
}

function Team({ title, names }: { title: string; names: string[] }) {
  return <div><h4 className="mb-2 flex items-center gap-2 font-black"><Users size={16}/>{title}</h4>{names.map((name, i) => <div className="mb-2 flex justify-between rounded-xl bg-black/25 p-3 text-sm" key={name}><span>{name}</span><span className="text-trust-soft">{roles[i]}</span></div>)}</div>;
}
