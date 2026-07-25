'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BalancePatch } from '@/lib/balance-types';
import { useLocale } from '@/components/LocaleProvider';
export default function PublicPatches({slug}:{slug?:string}) {
 const [patches,setPatches]=useState<BalancePatch[]>([]); const {locale}=useLocale();
 useEffect(()=>{fetch('/api/public/patches').then(r=>r.json()).then(payload=>{const rows=Array.isArray(payload)?payload:payload.patches||[];setPatches(rows.filter((patch:BalancePatch)=>['published','superseded'].includes(patch.status)&&patch.releaseChannel==='production'));});},[]);
 const shown=slug?patches.filter(patch=>patch.slug===slug):patches;
 return <main className="mx-auto min-h-screen max-w-5xl bg-trust-black p-5 text-white"><h1 className="mb-6 text-4xl font-black">TRUST Patch Notes</h1>{shown.map(patch=><article key={patch.id} className="mb-4 rounded-3xl border border-white/10 bg-white/5 p-6"><Link href={`/patches/${patch.slug}`}><h2 className="text-2xl font-bold">{patch.version} · {locale==='ru'?patch.titleRu:patch.titleEn}</h2></Link><p className="my-3 text-zinc-300">{locale==='ru'?patch.summaryRu:patch.summaryEn}</p>{patch.entries?.map(entry=><section key={entry.id} className="border-t border-white/10 py-3"><b>{locale==='ru'?entry.titleRu:entry.titleEn}</b><p>{locale==='ru'?entry.descriptionRu:entry.descriptionEn}</p></section>)}</article>)}</main>;
}
