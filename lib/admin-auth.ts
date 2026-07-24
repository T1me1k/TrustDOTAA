import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const COOKIE = 'trust_ops_session';
const MAX_AGE = 60 * 60 * 8;
const attempts = new Map<string,{count:number;reset:number}>();
function secret(){ return process.env.ADMIN_SESSION_SECRET || 'demo-admin-session-secret-change-me'; }
function sign(payload:string){ return crypto.createHmac('sha256', secret()).update(payload).digest('hex'); }
export function hashPassword(password:string){ return crypto.createHash('sha256').update(password).digest('hex'); }
export function verifyPassword(password:unknown){
  if (typeof password !== 'string') return false;
  const actual = Buffer.from(hashPassword(password), 'hex');
  const expectedHash = process.env.ADMIN_PASSWORD_HASH || hashPassword('admin');
  if (!/^[a-f\d]{64}$/i.test(expectedHash)) return false;
  return crypto.timingSafeEqual(actual, Buffer.from(expectedHash, 'hex'));
}
export function createSession(response:NextResponse,email:string){
  const exp=Math.floor(Date.now()/1000)+MAX_AGE;
  const payload=JSON.stringify({email,role:'Owner',exp});
  const token=Buffer.from(payload).toString('base64url')+'.'+sign(payload);
  response.cookies.set(COOKIE, token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', maxAge:MAX_AGE });
}
export function clearSession(){ cookies().delete(COOKIE); }
export function getSession(){
  const token=cookies().get(COOKIE)?.value;
  if(!token) return null;
  const [body,mac,...extra]=token.split('.');
  if(!body||!mac||extra.length) return null;
  try {
    const payload=Buffer.from(body,'base64url').toString();
    const expected=Buffer.from(sign(payload), 'hex');
    const supplied=Buffer.from(mac, 'hex');
    if(supplied.length!==expected.length || !crypto.timingSafeEqual(expected,supplied)) return null;
    const data=JSON.parse(payload) as {email?:unknown;role?:unknown;exp?:unknown};
    if(typeof data.email!=='string' || data.role!=='Owner' || typeof data.exp!=='number' || data.exp < Date.now()/1000) return null;
    return data as {email:string;role:'Owner';exp:number};
  } catch { return null; }
}
export function assertAdmin(){ const s=getSession(); if(!s) throw new Error('Unauthorized'); return s; }
export function checkRateLimit(ip:string){ const now=Date.now(); const item=attempts.get(ip) || {count:0, reset:now+15*60_000}; if(item.reset<now){ item.count=0; item.reset=now+15*60_000; } item.count++; attempts.set(ip,item); return item.count<=5; }
