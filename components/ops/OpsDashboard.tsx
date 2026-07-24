'use client';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, LogOut, Shield, ToggleLeft, Wifi, WifiOff } from 'lucide-react';
import { adaptAudit, adaptConfig, adaptDashboard, adaptFeatureFlags, adaptMatches, adaptPatches, adaptPlayers, adaptQueues, errorMessage, loadJson, type AuditEntry, type DashboardStats, type FeatureFlag, type Match, type Patch, type Player, type QueueEntry, type RuntimeConfigEntry } from '@/lib/ops-api';

const sections = ['Overview', 'Matchmaking', 'Feature Flags', 'Patches', 'Players', 'Queues', 'Matches', 'Audit Log', 'Settings'];
type SectionData = { dashboard: DashboardStats; queues: QueueEntry[]; matches: Match[]; audit: AuditEntry[]; featureFlags: FeatureFlag[]; patches: Patch[]; players: Player[] };
type SectionKey = keyof SectionData | 'config';
const initialData: SectionData = { dashboard: {}, queues: [], matches: [], audit: [], featureFlags: [], patches: [], players: [] };

export default function OpsDashboard() {
  const [config, setConfig] = useState<Record<string, RuntimeConfigEntry>>({});
  const [data, setData] = useState<SectionData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<SectionKey, string>>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('Overview');
  const [toast, setToast] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const requests: Array<[SectionKey, string, (payload: unknown) => unknown]> = [
      ['config', '/api/admin/config', adaptConfig], ['dashboard', '/api/admin/dashboard', adaptDashboard],
      ['queues', '/api/admin/queues', adaptQueues], ['matches', '/api/admin/matches', adaptMatches],
      ['audit', '/api/admin/audit', adaptAudit], ['featureFlags', '/api/admin/flags', adaptFeatureFlags],
      ['patches', '/api/admin/patches', adaptPatches], ['players', '/api/admin/players', adaptPlayers],
    ];
    await Promise.allSettled(requests.map(async ([key, path, adapter]) => {
      try {
        const value = adapter(await loadJson(path));
        if (key === 'config') setConfig(value as Record<string, RuntimeConfigEntry>);
        else setData(prev => ({ ...prev, [key]: value }));
        setErrors(prev => { const next = { ...prev }; delete next[key]; return next; });
      } catch (error) {
        setErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : 'Request failed' }));
      }
    }));
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function updateConfig(key: string, value: unknown) {
    try {
      const response = await fetch('/api/admin/config', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 401) { location.assign('/ops/login'); return; }
      if (!response.ok) throw new Error(errorMessage(payload, response.statusText || 'Update failed'));
      setConfig(prev => ({ ...prev, [key]: { ...(prev[key] ?? { key }), value } }));
      setToast(`${key} saved`);
    } catch (error) { setToast(`Update failed: ${error instanceof Error ? error.message : 'Request failed'}`); }
  }
  async function updateFlag(flag: FeatureFlag) {
    const enabled = !flag.enabled;
    try {
      await loadJson(`/api/admin/flags/${encodeURIComponent(flag.key)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
      setData(prev => ({ ...prev, featureFlags: prev.featureFlags.map(item => item.key === flag.key ? { ...item, enabled } : item) }));
      setToast(`${flag.key} saved`);
    } catch (error) { setToast(`Update failed: ${error instanceof Error ? error.message : 'Request failed'}`); }
  }
  async function cancelMatch(id: string) {
    try { await loadJson(`/api/admin/matches?id=${encodeURIComponent(id)}&action=cancel`, { method: 'POST' }); setToast(`Cancel requested for ${id}`); void refresh(); }
    catch (error) { setToast(`Cancel failed: ${error instanceof Error ? error.message : 'Request failed'}`); }
  }
  async function logout() { await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' }); location.assign('/ops/login'); }
  const value = <T,>(key: string, fallback: T): T => config[key]?.value as T ?? fallback;
  const errorFor = (...keys: SectionKey[]) => keys.map(key => errors[key]).filter(Boolean).join(' · ');
  if (loading && Object.keys(config).length === 0) return <main className="min-h-screen bg-trust-black p-8 text-white"><div className="animate-pulse rounded-3xl bg-white/10 p-10">Loading TRUST Ops…</div></main>;
  const online = Object.keys(errors).length === 0;
  return <main className="min-h-screen bg-trust-black bg-radial-trust text-white"><div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
    <aside className="border-r border-white/10 bg-black/30 p-5"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-trust-violet shadow-glow"><Shield /></span><div><p className="font-black tracking-[.25em]">TRUST OPS</p><p className="text-xs text-zinc-400">PRODUCTION ADMIN</p></div></div><Status online={online}/><nav className="mt-8 grid gap-2">{sections.map(section => <button key={section} onClick={() => setActive(section)} className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${active === section ? 'bg-trust-violet shadow-glow' : 'bg-white/5 hover:bg-white/10'}`}>{section}</button>)}</nav></aside>
    <section className="p-5 md:p-8"><header className="mb-6 flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:flex-row md:items-center"><div><p className="text-sm text-zinc-400">Server-side control plane backed by Railway PostgreSQL API</p><h1 className="text-4xl font-black">{active}</h1></div><div className="flex gap-3"><button onClick={() => void refresh()} className="rounded-2xl border border-white/10 px-4 py-3 font-bold">Retry</button><button onClick={() => void logout()} className="rounded-2xl border border-white/10 px-4 py-3" aria-label="Logout"><LogOut/></button></div></header>
    {toast && <p className="mb-4 rounded-2xl border border-trust-soft/30 bg-trust-violet/10 p-3 text-trust-soft">{toast}</p>}
    {active === 'Overview' && <><SectionError message={errorFor('dashboard', 'config')}/><Grid cards={[[String(data.dashboard.playersOnline ?? data.dashboard.players ?? 0), 'Players online'], [String(data.dashboard.activeQueues ?? data.queues.length), 'Active queues'], [String(data.dashboard.matches ?? data.matches.length), 'Matches'], [value('maintenance_enabled', false) ? 'On' : 'Off', 'Maintenance'], [String(value('minimum_trust_score', '—')), 'Minimum trust'], [String(value('enabled_regions', '—')), 'Enabled regions']]}/></>}
    {active === 'Matchmaking' && <><SectionError message={errorFor('config')}/><Panel><Toggle label="Matchmaking enabled" value={value('matchmaking_enabled', false)} on={() => void updateConfig('matchmaking_enabled', !value('matchmaking_enabled', false))}/><Toggle label="Play enabled" value={value('play_button_enabled', false)} on={() => void updateConfig('play_button_enabled', !value('play_button_enabled', false))}/><Toggle label="Maintenance" value={value('maintenance_enabled', false)} on={() => void updateConfig('maintenance_enabled', !value('maintenance_enabled', false))}/><NumberInput label="Accept timeout seconds" value={value('accept_timeout_seconds', 0)} on={next => void updateConfig('accept_timeout_seconds', next)}/><TextInput label="Maintenance message" value={value('maintenance_message', '')} on={next => void updateConfig('maintenance_message', next)}/></Panel></>}
    {active === 'Feature Flags' && <><SectionError message={errorFor('featureFlags')}/><Table rows={data.featureFlags.map(flag => [flag.key, flag.description ?? '—', flag.enabled ? 'On' : 'Off', flag.environment ?? '—', flag.updatedAt ?? '—'])} actionLabel="Toggle" action={index => void updateFlag(data.featureFlags[index])}/></>}
    {active === 'Patches' && <><SectionError message={errorFor('patches')}/><Table rows={data.patches.map(patch => [patch.version ?? patch.name ?? patch.id ?? '—', patch.status ?? '—', patch.releasedAt ?? patch.createdAt ?? '—'])}/></>}
    {active === 'Players' && <><SectionError message={errorFor('players')}/><Table rows={data.players.map(player => [player.personaName ?? player.displayName ?? '—', player.steamId ?? player.id ?? '—', String(player.trustScore ?? '—'), player.status ?? '—'])}/></>}
    {active === 'Queues' && <><SectionError message={errorFor('queues')}/><Table rows={data.queues.map(queue => [queue.id ?? '—', queue.region ?? '—', queue.status ?? '—', String(queue.players ?? '—')])}/></>}
    {active === 'Matches' && <><SectionError message={errorFor('matches')}/><Table rows={data.matches.map(match => [match.id ?? match.matchId ?? '—', match.status ?? '—', match.region ?? '—', String(match.playersAccepted ?? match.acceptedPlayers ?? '—')])} actionLabel="Cancel" action={index => void cancelMatch(data.matches[index].id ?? data.matches[index].matchId ?? '')}/></>}
    {active === 'Audit Log' && <><SectionError message={errorFor('audit')}/><Table rows={data.audit.map(entry => [entry.createdAt ?? entry.time ?? '—', entry.actor ?? entry.admin ?? '—', entry.action ?? '—', entry.entity ?? '—', entry.result ?? '—'])}/></>}
    {active === 'Settings' && <Panel><p>Configuration is loaded as validated key/value entries. Admin credentials remain server-side.</p></Panel>}
    </section></div></main>;
}
function Status({ online }: { online: boolean }) { return <div className={`mt-5 rounded-2xl border p-3 text-sm ${online ? 'border-emerald-300/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-300/30 bg-amber-500/10 text-amber-100'}`}>{online ? <Wifi className="inline" size={16}/> : <WifiOff className="inline" size={16}/>} API {online ? 'Online' : 'Partial outage'}</div>; }
function SectionError({ message }: { message: string }) { return message ? <p role="alert" className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-950/60 p-3 text-rose-100"><AlertTriangle className="inline"/> {message}</p> : null; }
function Panel({ children }: { children: React.ReactNode }) { return <div className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">{children}</div>; }
function Grid({ cards }: { cards: string[][] }) { return <div className="grid gap-4 md:grid-cols-3">{cards.map(card => <div key={card[1]} className="rounded-3xl border border-white/10 bg-white/5 p-5"><BarChart3 className="text-trust-soft"/><p className="mt-4 text-3xl font-black">{card[0]}</p><p className="text-sm text-zinc-400">{card[1]}</p></div>)}</div>; }
function Toggle({ label, value, on }: { label: string; value: boolean; on: () => void }) { return <button onClick={on} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3 text-left"><span>{label}</span><span className={value ? 'text-emerald-300' : 'text-zinc-500'}><ToggleLeft className="inline"/> {value ? 'On' : 'Off'}</span></button>; }
function NumberInput({ label, value, on }: { label: string; value: number; on: (value: number) => void }) { return <label className="grid gap-2 text-sm text-zinc-300">{label}<input type="number" value={value} onChange={event => on(Number(event.target.value))} className="rounded-2xl border border-white/10 bg-black/40 p-3 text-white"/></label>; }
function TextInput({ label, value, on }: { label: string; value: string; on: (value: string) => void }) { const [draft, setDraft] = useState(value); useEffect(() => setDraft(value), [value]); return <label className="grid gap-2 text-sm text-zinc-300">{label}<input value={draft} onBlur={() => { if (draft !== value) on(draft); }} onChange={event => setDraft(event.target.value)} className="rounded-2xl border border-white/10 bg-black/40 p-3 text-white"/></label>; }
function Table({ rows, action, actionLabel }: { rows: string[][]; action?: (index: number) => void; actionLabel?: string }) { return <div className="overflow-auto rounded-3xl border border-white/10 bg-white/5"><table className="w-full min-w-[720px] text-left text-sm"><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-white/10">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-3">{cell}</td>)}{action && <td><button onClick={() => action(index)} className="rounded-xl bg-trust-violet px-3 py-2 font-bold">{actionLabel}</button></td>}</tr>)}</tbody></table>{rows.length === 0 && <p className="p-5 text-zinc-400">No records</p>}</div>; }
