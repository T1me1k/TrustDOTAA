'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { balanceApi } from '@/lib/balance-api';
import type { BalancePatch, ValidationResult } from '@/lib/balance-types';
import { canEditPatch, workflowActions } from '@/lib/balance-validation';
import { Button, Card, Empty, Header, Status } from './StudioUI';

export function PatchCatalog({ review = false }: { review?: boolean }) {
  const [patches, setPatches] = useState<BalancePatch[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    balanceApi.patches()
      .then(items => setPatches(review ? items.filter(item => ['in_review', 'approved', 'scheduled'].includes(item.status)) : items))
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Patches could not be loaded'));
  }, [review]);

  return <>
    <Header title={review ? 'Review Center' : 'Patch Catalog'} description="Validated TRUST releases with explicit lifecycle states." actions={!review && <Link href="/ops/balance/patches/new" className="rounded-xl bg-trust-violet px-4 py-2 font-bold">Create patch</Link>}/>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-300/30 bg-rose-950/50 p-3 text-rose-200">{error}</p>}
    <div className="grid gap-3">
      {patches.map(patch => <Link href={`/ops/balance/patches/${patch.id}`} key={patch.id}><Card className="grid gap-2 sm:grid-cols-5"><b>{patch.version}</b><span>{patch.titleEn || patch.slug}</span><span>Status: {patch.status}</span><span>Channel: {patch.releaseChannel}</span><span>Entries: {patch.entries?.length || 0}</span></Card></Link>)}
      {!patches.length && !error && <Empty>No patches in this queue.</Empty>}
    </div>
  </>;
}

const blank: Partial<BalancePatch> = {
  slug: '',
  version: '',
  titleEn: '',
  titleRu: '',
  summaryEn: '',
  summaryRu: '',
  releaseChannel: 'test',
  status: 'draft',
  rowVersion: 0,
  entries: [],
};

export function PatchEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [patch, setPatch] = useState<Partial<BalancePatch>>(blank);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [validation, setValidation] = useState<ValidationResult>();

  useEffect(() => {
    if (!id) return;
    balanceApi.patch(id).then(setPatch).catch(reason => setError(reason instanceof Error ? reason.message : 'Patch could not be loaded'));
  }, [id]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const next = await balanceApi.savePatch(patch, id);
      setPatch(next);
      setMessage('Patch saved');
      if (!id) router.replace(`/ops/balance/patches/${next.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Patch could not be saved');
    } finally {
      setSaving(false);
    }
  }

  async function action(name: string) {
    if (!id) return;
    setSaving(true);
    setError('');
    try {
      const fresh = await balanceApi.patch(id);
      if (name === 'validate') {
        const result = await balanceApi.validatePatch(id, fresh.rowVersion);
        setValidation(result);
        setMessage(result.valid ? 'Validation passed' : 'Validation found blocking errors');
        return;
      }
      if (name === 'publish' && prompt(`Type ${fresh.version} to publish`) !== fresh.version) return;
      const body: Record<string, unknown> = { rowVersion: fresh.rowVersion };
      if (name === 'schedule') {
        const scheduledAt = prompt('Schedule ISO date/time, for example 2026-08-01T18:00:00Z');
        if (!scheduledAt) return;
        body.scheduledAt = scheduledAt;
      }
      const changed = await balanceApi.patchAction(id, name, body);
      if (name === 'rollback' && changed.id && changed.id !== id) {
        router.replace(`/ops/balance/patches/${changed.id}`);
        return;
      }
      setPatch(await balanceApi.patch(id));
      setMessage(`${name} completed`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `${name} failed`);
    } finally {
      setSaving(false);
    }
  }

  const editable = !id || canEditPatch(patch.status || 'draft');
  return <>
    <Header title={id ? `Patch ${patch.version}` : 'Create patch'} description={`${patch.status} · rowVersion ${patch.rowVersion}`} actions={<><Status state={saving ? 'saving' : error ? 'error' : 'saved'}/>{editable && <Button onClick={save} disabled={saving}>Save</Button>}{id && workflowActions(patch.status || 'draft').map(item => <Button key={item} onClick={() => action(item)} disabled={saving}>{item}</Button>)}</>}/>
    {message && <p role="status" className="mb-3 rounded-xl bg-emerald-900/40 p-3">{message}</p>}
    {error && <p role="alert" className="mb-3 rounded-xl border border-rose-300/30 bg-rose-950/50 p-3 text-rose-200">{error}</p>}
    {validation && <Card className="mb-4"><h2 className="font-bold">Validation result: {validation.valid ? 'valid' : 'blocked'}</h2><pre className="mt-2 max-h-52 overflow-auto text-xs">{JSON.stringify(validation, null, 2)}</pre></Card>}
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card className="grid gap-3 md:grid-cols-2">
        {(['slug', 'version', 'titleEn', 'titleRu', 'summaryEn', 'summaryRu'] as const).map(key => <label key={key}>{key}<input disabled={!editable} value={String(patch[key] || '')} onChange={event => setPatch(current => ({ ...current, [key]: event.target.value }))} className="block w-full rounded-xl bg-black p-3 disabled:opacity-50"/></label>)}
        <label>Release channel<select disabled={!editable} value={patch.releaseChannel} onChange={event => setPatch(current => ({ ...current, releaseChannel: event.target.value as 'test' | 'production' }))} className="block w-full rounded-xl bg-black p-3"><option>test</option><option>production</option></select></label>
      </Card>
      <Card><h2 className="font-bold">Inspector</h2><p>{patch.entries?.length || 0} changes</p><p className="text-sm text-zinc-400">Published and superseded patches are read-only. Workflow actions always refresh rowVersion first.</p></Card>
    </div>
  </>;
}
