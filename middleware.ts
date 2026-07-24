import { NextRequest, NextResponse } from 'next/server';
export function middleware(req: NextRequest){
  const path=req.nextUrl.pathname;
  if(path==='/ops/login' || path==='/api/admin/auth/login') return NextResponse.next();
  if(path.startsWith('/ops') || path.startsWith('/api/admin')){
    const token=req.cookies.get('trust_ops_session')?.value;
    if(!token){ if(path.startsWith('/api/')) return NextResponse.json({error:'Unauthorized'},{status:401}); return NextResponse.redirect(new URL('/ops/login', req.url)); }
  }
  return NextResponse.next();
}
export const config={ matcher:['/ops/:path*','/api/admin/:path*'] };
