'use client';

import { useRef } from 'react';
import { Activity, Clock, Loader2, Play, Radar, RotateCcw, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Card, Pill, Shell } from '@/components/Shell';
import { formatTime, useMatchmaking } from '@/components/MatchmakingProvider';
import { regions as fallbackRegions, roles as fallbackRoles, stats as fallbackStats } from '@/lib/data';
import { useRuntimeConfig } from '@/components/useRuntimeConfig';
import { useLocale } from '@/components/LocaleProvider';

export default function HomeClient() {
  const { busy, cancelSearch, phase, selectedRoles, steamAuthenticated, regions: selectedRegions, resetDemo, searchSeconds, toggleRole, toggleRegion, startSearch } = useMatchmaking();
  const { locale, t } = useLocale();
  const ru = locale === 'ru';
  const config = useRuntimeConfig();
  const stats = config?.content?.stats ?? fallbackStats;
  const regions = config?.regions?.filter((item) => item.enabled).map((item) => item.name) ?? fallbackRegions;
  const roles = config?.roles?.filter((item) => item.enabled).sort((a,b)=>a.order-b.order).map((item)=>item.name) ?? fallbackRoles;
  const queueEnabled = Boolean(config?.matchmaking?.enabled ?? true) && Boolean(config?.featureFlags.matchmaking_enabled?.enabled ?? true) && Boolean(config?.featureFlags.play_button_enabled?.enabled ?? true);
  const isSearching = phase === 'searching';
  const patchClicks = useRef<number[]>([]);
  function openOpsGesture() {
    const now = Date.now();
    patchClicks.current = [...patchClicks.current.filter((time) => now - time < 3000), now];
    if (patchClicks.current.length >= 5) window.location.href = '/ops/login';
  }

  return (
    <Shell>
      <div className="space-y-8">
        <section id="home" className="grid items-center gap-8 py-10 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-7">
            <Pill><Sparkles className="mr-1 inline" size={14} /> {config?.content?.seasonalCaption || 'Interactive Season One demo'}</Pill>
            <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">{config?.content?.heroTitle || t('heroTitle')}</h1>
            <p className="max-w-2xl text-lg text-zinc-300">{config?.content?.heroText || t('heroText')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a aria-disabled={!queueEnabled} href="#queue" className={`group inline-flex items-center justify-center gap-3 rounded-2xl px-8 py-4 text-lg font-black shadow-glow transition ${queueEnabled ? 'bg-trust-violet hover:scale-[1.02] hover:bg-trust-glow' : 'pointer-events-none bg-zinc-700 opacity-50'}`}><Play className="fill-white" /> Play</a>
              <Link href="/leaderboard" className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-center font-bold text-zinc-200 transition hover:-translate-y-1 hover:bg-white/10">Leaderboard</Link>
            </div>
          </div>
          <Card className="animate-float"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm text-zinc-400">Live queue</p><h2 className="text-3xl font-black">Prime 5v5</h2></div><Activity className="text-trust-soft" /></div><div className="grid grid-cols-2 gap-3">{stats.map((s) => <div className="rounded-2xl bg-trust-panel/70 p-4 transition hover:bg-white/10" key={s.label}><p className="text-xs text-zinc-500">{s.label}</p><p className="mt-1 text-2xl font-black">{s.value}</p><p className="text-xs text-trust-soft">{s.delta}</p></div>)}</div></Card>
        </section>

        <section id="queue" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="mb-6 flex items-center gap-3"><Radar className="text-trust-soft" /><h2 className="text-3xl font-black">{t('regionRole')}</h2></div>
            <p className="mb-3 text-sm text-zinc-400">{t('regions')} · {t('selected',{count:selectedRegions.length})}</p>
            <div className="flex flex-wrap gap-3">{regions.map((item) => { const active=selectedRegions.includes(item); const disabled=!active&&selectedRegions.length>=3; return <button disabled={disabled} onClick={() => toggleRegion(item)} className={`rounded-full px-5 py-2 text-sm font-bold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 ${active ? 'bg-white text-trust-black' : 'bg-white/5 text-zinc-300'}`} key={item}>{item}</button>; })}</div>
            <p className="mb-3 mt-6 text-sm text-zinc-400">{t('role')} · {ru ? `выбрано ${selectedRoles.length} из 5` : `${selectedRoles.length} of 5 selected`}</p>
            <div className="grid gap-3 sm:grid-cols-5">{roles.map((item) => <RoleButton active={selectedRoles.includes(item)} disabled={busy} key={item} label={item} onClick={() => toggleRole(item)} />)}</div>
            <p className="mt-3 text-xs text-zinc-500">{ru ? 'Можно выбрать любое количество ролей от одной до пяти. В найденном матче сервер назначит одну роль.' : 'Choose any 1–5 roles. The server assigns one role when a match is formed.'}</p>
          </Card>
          <Card id="scenario"><p className="text-zinc-400">Matchmaking</p><h3 className="mt-2 text-4xl font-black">{isSearching ? formatTime(searchSeconds) : phase === 'empty' || phase === 'idle' ? 'Ready' : phase.toUpperCase()}</h3><p className="mt-4 text-sm text-zinc-400">Selected: <b className="text-white">{selectedRegions.join(', ')}</b> · <b className="text-white">{selectedRoles.join(', ')}</b></p>{!queueEnabled && <p className="mt-3 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-100">{config?.matchmaking?.disabledMessage || config?.content?.queueDisabledText}</p>}{steamAuthenticated === false && <p className="mt-3 rounded-2xl border border-amber-300/30 bg-amber-500/10 p-3 text-sm text-amber-100">{ru ? 'Для поиска матча необходимо войти через Steam.' : 'Steam sign-in is required before matchmaking.'}</p>}<div className="mt-6 grid gap-3">{steamAuthenticated === false ? <a href="/api/backend/auth/steam/start" className="rounded-2xl bg-white py-4 text-center font-black text-trust-black transition hover:bg-trust-soft">{ru ? 'Войти через Steam' : 'Sign in with Steam'}</a> : <button onClick={startSearch} disabled={busy || isSearching || !queueEnabled || steamAuthenticated !== true || selectedRoles.length === 0} className="rounded-2xl bg-trust-violet py-4 font-black shadow-glow transition hover:bg-trust-glow disabled:cursor-wait disabled:opacity-60">{isSearching ? <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" /> {ru ? 'Поиск…' : 'Searching...'}</span> : ru ? 'Начать поиск' : 'Start search'}</button>}{isSearching && <button disabled={busy} onClick={cancelSearch} className="rounded-2xl border border-white/10 py-3 font-bold transition hover:border-rose-300/50 hover:bg-rose-500/10 hover:text-rose-200">{ru ? 'Отменить поиск' : 'Cancel search'}</button>}<button disabled={busy} onClick={resetDemo} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 font-bold transition hover:bg-white/10 disabled:opacity-50"><RotateCcw size={18} /> {ru ? 'Сбросить состояние' : 'Reset state'}</button></div></Card>
        </section>

        <Card><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-trust-violet/20 text-trust-soft"><Clock /></span><div><h2 className="text-3xl font-black">Demo states</h2><p className="mt-1 text-zinc-400">Empty, loading/searching, error, match found, accept, match room, connection, launch and completed screens are handled globally across every page.</p></div></div></Card>

        <section id="patch"><Card><Zap className="mb-4 text-trust-soft" /><h2 className="text-3xl font-black">Active TRUST Patch</h2><p className="mt-3 text-zinc-300">Patch <button type="button" onClick={openOpsGesture} className="font-black text-trust-soft underline-offset-4 hover:underline" aria-label="Patch version">{config?.patch?.version || '1.04'}</button>: {config?.patch?.summary || 'stricter smurf signals, role-performance MMR, faster remake votes and improved behavior weighting for high-rank lobbies.'}</p></Card></section>
      </div>
    </Shell>
  );
}

function RoleButton({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return <button disabled={disabled} onClick={onClick} className={`rounded-2xl border p-4 text-sm font-bold transition hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 ${active ? 'border-trust-soft bg-trust-violet/30 shadow-glow' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>{label}</button>;
}
