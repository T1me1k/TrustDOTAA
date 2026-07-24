'use client';
import { useEffect, useState } from 'react';
import type { RuntimeConfig } from '@/lib/runtime-config';
export function useRuntimeConfig(){ const [config,setConfig]=useState<RuntimeConfig|null>(null); useEffect(()=>{ let live=true; async function load(){ try{ const r=await fetch('/api/backend/config/public',{cache:'no-store'}); if(live&&r.ok) setConfig(await r.json()); }catch{} } load(); const id=window.setInterval(load,5000); return()=>{ live=false; window.clearInterval(id); }; },[]); return config; }
