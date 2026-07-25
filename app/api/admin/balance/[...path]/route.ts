import { NextRequest, NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/admin-auth';
import { backendBaseUrl } from '@/lib/backend-proxy';
import { IMPORT_LIMIT } from '@/lib/balance-validation';

const SAFE_SEGMENT=/^[A-Za-z0-9_-]+$/;
function safeBalancePath(parts:string[]){return parts.length>0&&parts.every(part=>part.length>0&&SAFE_SEGMENT.test(part)&&part!=='.'&&part!=='..');}
function sameOrigin(req:NextRequest){const origin=req.headers.get('origin');if(!origin)return true;const expected=new URL(req.url).origin;if(origin===expected)return true;const forwardedHost=req.headers.get('x-forwarded-host');const forwardedProto=req.headers.get('x-forwarded-proto')||'https';return Boolean(forwardedHost&&origin===`${forwardedProto}://${forwardedHost}`);}
function error(status:number,error:string,requestId:string){return NextResponse.json({error,requestId},{status,headers:{'cache-control':'no-store'}})}
async function handle(req:NextRequest,ctx:{params:{path:string[]}}){
 const requestId=req.headers.get('x-request-id')||crypto.randomUUID();
 try{assertAdmin()}catch{return error(401,'Unauthorized',requestId)}
 if(!safeBalancePath(ctx.params.path))return error(400,'Invalid balance API path',requestId);
 if(req.method!=='GET'&&!sameOrigin(req))return error(403,'Origin check failed',requestId);
 const isImport=ctx.params.path[0]==='import'; const contentType=req.headers.get('content-type')||'';
 if(isImport&&req.method==='POST'&&!contentType.toLowerCase().startsWith('application/json'))return error(400,'Import requires application/json',requestId);
 const length=Number(req.headers.get('content-length')||0);if(isImport&&length>IMPORT_LIMIT)return error(413,'Import exceeds 1 MB',requestId);
 const url=new URL(`/v1/admin/balance/${ctx.params.path.map(encodeURIComponent).join('/')}`,backendBaseUrl());req.nextUrl.searchParams.forEach((v,k)=>url.searchParams.append(k,v));
 const key=process.env.BACKEND_ADMIN_API_KEY;if(!key)return error(500,'Balance backend is not configured',requestId);
 let body:string|undefined;if(req.method!=='GET'){body=await req.text();if(isImport&&new TextEncoder().encode(body).byteLength>IMPORT_LIMIT)return error(413,'Import exceeds 1 MB',requestId)}
 try{const upstream=await fetch(url,{method:req.method,body,cache:'no-store',headers:{'content-type':contentType||'application/json','x-admin-api-key':key,authorization:`Bearer ${key}`,'x-request-id':requestId}});const responseBody=await upstream.arrayBuffer();return new NextResponse(responseBody,{status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/json','cache-control':'no-store','x-request-id':requestId}})}catch{return error(503,'Balance backend unavailable',requestId)}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;
