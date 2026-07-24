import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, createSession, verifyPassword } from '@/lib/admin-auth';
export async function POST(req:NextRequest){
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if(!checkRateLimit(ip)) return NextResponse.json({error:'Too many attempts'},{status:429});
  const body: unknown = await req.json().catch(() => null);
  const email = body && typeof body === 'object' && 'email' in body ? (body as {email?:unknown}).email : null;
  const password = body && typeof body === 'object' && 'password' in body ? (body as {password?:unknown}).password : null;
  const expected=process.env.ADMIN_EMAIL || 'admin@trust.local';
  if(typeof email!== 'string' || email!==expected || !verifyPassword(password)) return NextResponse.json({error:'Invalid credentials'},{status:401});
  const response=NextResponse.json({ok:true});
  createSession(response,email);
  return response;
}
