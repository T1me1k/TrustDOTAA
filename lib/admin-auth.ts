import 'server-only';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE = 'trust_ops_session';
const MAX_AGE = 60 * 60 * 8;
const attempts = new Map<string,{count:number;reset:number}>();
function secret(){ return process.env.ADMIN_SESSION_SECRET || 'demo-admin-session-secret-change-me'; }
function sign(payload:string){ return crypto.createHmac('sha256', secret()).update(payload).digest('hex'); }
export function hashPassword(password:string){ return crypto.createHash('sha256').update(password).digest('hex'); }
export function verifyPassword(password:string){ const expected=process.env.ADMIN_PASSWORD_HASH || hashPassword('admin'); return crypto.timingSafeEqual(Buffer.from(hashPassword(password)), Buffer.from(expected)); }
export function createSession(email:string){ const exp=Math.floor(Date.now()/1000)+MAX_AGE; const payload=JSON.stringify({email,role:'Owner',exp}); const token=Buffer.from(payload).toString('base64url')+'.'+sign(payload); cookies().set(COOKIE, token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', maxAge:MAX_AGE }); }
export function clearSession(){ cookies().delete(COOKIE); }
export function getSession(){ const token=cookies().get(COOKIE)?.value; if(!token) return null; const [body,mac]=token.split('.'); if(!body||!mac) return null; const payload=Buffer.from(body,'base64url').toString(); if(sign(payload)!==mac) return null; const data=JSON.parse(payload) as {email:string;role:string;exp:number}; if(data.exp < Date.now()/1000) return null; return data; }
export function assertAdmin(){ const s=getSession(); if(!s) throw new Error('Unauthorized'); return s; }
export function checkRateLimit(ip:string){ const now=Date.now(); const item=attempts.get(ip) || {count:0, reset:now+15*60_000}; if(item.reset<now){ item.count=0; item.reset=now+15*60_000; } item.count++; attempts.set(ip,item); return item.count<=5; }
