'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { balanceApi, BalanceApiError } from '@/lib/balance-api';
import type { Hero } from '@/lib/balance-types';
import { validateHero } from '@/lib/balance-validation';
import { Button, Card, DirtyGuard, Header, Status } from './StudioUI';

const tabs = ['Overview', 'Base Stats', 'Abilities', 'Innate', 'Facets', 'Talents', 'Scepter & Shard', 'Balance Preview', 'Version History', 'Audit'];
const stats = ['baseStrength', 'strengthGain', 'baseAgility', 'agilityGain', 'baseIntelligence', 'intelligenceGain', 'baseHealth', 'healthRegen', 'baseMana', 'manaRegen', 'armor', 'magicResistance', 'moveSpeed', 'turnRate', 'attackRange', 'baseAttackTime', 'attackPoint', 'projectileSpeed', 'damageMin', 'damageMax', 'dayVision', 'nightVision', 'collisionSize'];
const blank: Partial<Hero> = {
  slug: '',
  nameEn: '',
  nameRu: '',
  primaryAttribute: 'strength',
  attackType: 'melee',
  roles: [],
  tags: [],
  status: 'hidden',
  sortOrder: 0,
  rowVersion: 0,
  baseStats: {},
};

export default function HeroEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [hero, setHero] = useState<Partial<Hero>>(blank);
  const [original, setOriginal] = useState<Partial<Hero>>(blank);
  const [tab, setTab] = useState('Overview');
  const [state, setState] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [conflict, setConflict] = useState<unknown>();
  const [loadError, setLoadError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!id) return;
    balanceApi.hero(id)
      .then(value => {
        setHero(value);
        setOriginal(value);
      })
      .catch(error => setLoadError(error instanceof Error ? error.message : 'Hero could not be loaded'));
  }, [id]);

  const dirty = JSON.stringify(hero) !== JSON.stringify(original);
  const save = useCallback(async () => {
    const errors = validateHero(hero);
    if (Object.keys(errors).length) {
      setState('error');
      return;
    }
    setState('saving');
    try {
      const saved = await balanceApi.saveHero(hero, id);
      setHero(saved);
      setOriginal(saved);
      setState('saved');
      if (!id) router.replace(`/ops/balance/heroes/${saved.id}`);
    } catch (error) {
      setState('error');
      if (error instanceof BalanceApiError && error.status === 409) setConflict(error.payload);
      else setLoadError(error instanceof Error ? error.message : 'Hero could not be saved');
    }
  }, [hero, id, router]);

  useEffect(() => {
    if (!dirty) return;
    setState('unsaved');
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1000);
    return () => clearTimeout(timer.current);
  }, [dirty, hero, save]);

  const set = (key: keyof Hero, value: unknown) => setHero(current => ({ ...current, [key]: value }));
  const errors = validateHero(hero);

  return <>
    <DirtyGuard dirty={dirty}/>
    <Header title={id ? hero.nameEn || 'Hero editor' : 'Create hero'} description={`rowVersion ${hero.rowVersion ?? 0} · TRUST custom mode`} actions={<><Status state={state}/><Button disabled={!dirty || state === 'saving'} onClick={save}>Save</Button></>}/>
    {loadError && <p role="alert" className="mb-4 rounded-xl border border-rose-300/30 bg-rose-950/50 p-3 text-rose-200">{loadError}</p>}
    <div className="mb-4 flex gap-2 overflow-auto" role="tablist">{tabs.map(item => <button role="tab" aria-selected={tab === item} onClick={() => setTab(item)} key={item} className={`whitespace-nowrap rounded-xl px-3 py-2 ${tab === item ? 'bg-trust-violet' : 'bg-white/5'}`}>{item}</button>)}</div>
    {conflict && <Card className="mb-4 border-amber-400/40"><h2 className="font-bold">Version conflict</h2><p>Your local edits are preserved. Reload the server version or copy local JSON.</p><Button onClick={() => navigator.clipboard.writeText(JSON.stringify(hero, null, 2))}>Copy local JSON</Button> <Button onClick={() => location.reload()}>Reload server version</Button><pre className="mt-3 max-h-40 overflow-auto text-xs">{JSON.stringify(conflict, null, 2)}</pre></Card>}
    {tab === 'Overview' && <Card className="grid gap-3 md:grid-cols-2">
      {(['slug', 'externalId', 'nameEn', 'nameRu', 'shortName', 'portraitUrl', 'iconUrl'] as const).map(key => <label key={key}>{key}<input value={String(hero[key] || '')} onChange={event => set(key, event.target.value)} aria-invalid={Boolean(errors[key])} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 p-2"/>{errors[key] && <small className="text-rose-300">{errors[key]}</small>}</label>)}
      <label>Primary attribute<select value={hero.primaryAttribute} onChange={event => set('primaryAttribute', event.target.value)} className="block w-full rounded-xl bg-black p-2"><option>strength</option><option>agility</option><option>intelligence</option><option>universal</option></select></label>
      <label>Attack type<select value={hero.attackType} onChange={event => set('attackType', event.target.value)} className="block w-full rounded-xl bg-black p-2"><option>melee</option><option>ranged</option></select></label>
      <label>Status<select value={hero.status} onChange={event => set('status', event.target.value)} className="block w-full rounded-xl bg-black p-2"><option>hidden</option><option>active</option><option>disabled</option><option>archived</option></select></label>
      <label>Roles (comma separated)<input value={hero.roles?.join(', ') || ''} onChange={event => set('roles', event.target.value.split(',').map(value => value.trim()).filter(Boolean))} className="block w-full rounded-xl bg-black p-2"/></label>
    </Card>}
    {tab === 'Base Stats' && <Card className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{stats.map(key => <label key={key}>{key}<input type="number" step="any" value={typeof hero.baseStats?.[key] === 'number' ? String(hero.baseStats[key]) : ''} onChange={event => setHero(current => ({ ...current, baseStats: { ...current.baseStats, [key]: event.target.value === '' ? 0 : Number(event.target.value) } }))} className="block w-full rounded-xl bg-black p-2"/>{errors[`baseStats.${key}`] && <small className="text-rose-300">{errors[`baseStats.${key}`]}</small>}</label>)}</Card>}
    {tab === 'Balance Preview' && <Card><h2 className="font-bold">Balance Lab</h2><input aria-label="Hero level" type="range" min="1" max="30" defaultValue="1" className="w-full"/><p className="mt-4 text-amber-200">Approximation — not the official Dota 2 combat engine.</p></Card>}
    {!['Overview', 'Base Stats', 'Balance Preview'].includes(tab) && <Card><h2 className="font-bold">{tab}</h2><p className="text-zinc-400">Entities in this section are persisted through their dedicated Balance API endpoints.</p></Card>}
  </>;
}
