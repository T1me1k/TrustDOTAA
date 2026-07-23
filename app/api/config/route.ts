import { NextResponse } from 'next/server';
import { getRuntimeConfig, publicRuntimeConfig } from '@/lib/runtime-config';
export async function GET(){ return NextResponse.json(publicRuntimeConfig(await getRuntimeConfig()), { headers:{'Cache-Control':'no-store'} }); }
