'use client';

import { useState } from 'react';
import { balanceApi } from '@/lib/balance-api';
import { validateImport } from '@/lib/balance-validation';
import type { ValidationResult } from '@/lib/balance-types';
import { Button, Card, Header } from './StudioUI';

export default function ImportExport() {
  const [payload, setPayload] = useState<unknown>();
  const [result, setResult] = useState<ValidationResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function file(selected: File) {
    setError('');
    setMessage('');
    if (selected.size > 1024 * 1024) {
      setError('Import exceeds 1 MB.');
      return;
    }
    try {
      const value = JSON.parse(await selected.text());
      const local = validateImport(value, selected.size);
      if (!local.valid) throw Error(local.error);
      setPayload(value);
      setResult(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Invalid JSON');
    }
  }

  async function dryRun() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setResult(await balanceApi.validateImport(payload));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Validation failed');
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!result?.valid || !result.dryRunJobId || !payload) return;
    setBusy(true);
    setError('');
    try {
      await balanceApi.applyImport(payload, result.dryRunJobId);
      balanceApi.clearHeroCache();
      setMessage('Import applied successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Header title="Import / Export" description="Schema 1.0 · maximum 1 MB · server dry-run required."/>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="font-bold">Import roster</h2>
        <input type="file" accept="application/json,.json" onChange={event => event.target.files?.[0] && file(event.target.files[0])} className="my-4 block"/>
        {error && <p role="alert" className="mb-3 text-rose-300">{error}</p>}
        {message && <p role="status" className="mb-3 text-emerald-300">{message}</p>}
        <Button disabled={!payload || busy} onClick={dryRun}>Validate dry-run</Button>{' '}
        <Button disabled={!result?.valid || !result.dryRunJobId || busy} onClick={apply}>Apply verified import</Button>
        {result && <pre className="mt-3 max-h-64 overflow-auto text-xs">{JSON.stringify(result, null, 2)}</pre>}
      </Card>
      <Card>
        <h2 className="font-bold">Export catalog</h2>
        <p className="my-3 text-zinc-400">Downloads server-generated JSON without exposing administrative credentials.</p>
        <a href="/api/admin/balance/export?formatted=true" className="rounded-xl bg-trust-violet px-4 py-2 font-bold">Download formatted JSON</a>
      </Card>
    </div>
  </>;
}
