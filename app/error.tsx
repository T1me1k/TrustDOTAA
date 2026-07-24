'use client';
import { useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLocale();
  useEffect(() => { console.error('Client render error', error.digest || error.message); }, [error]);
  return <main className="grid min-h-screen place-items-center bg-trust-black p-6 text-white"><section className="w-full max-w-lg rounded-3xl border border-white/10 bg-trust-panel p-8 text-center shadow-glow"><h1 className="text-3xl font-black">{t('clientErrorTitle')}</h1><p className="mt-4 text-zinc-300">{t('clientErrorMessage')}</p><button className="mt-7 rounded-2xl bg-white px-6 py-3 font-bold text-trust-black" onClick={() => { reset(); window.location.reload(); }}>{t('reload')}</button></section></main>;
}
