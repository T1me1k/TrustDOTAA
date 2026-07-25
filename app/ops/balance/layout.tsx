import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/admin-auth';
import BalanceShell from '@/components/ops/balance/BalanceShell';
export const metadata:Metadata={title:'TRUST Balance Studio',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){const session=getSession();if(!session)redirect('/ops/login');return <BalanceShell admin={session.email}>{children}</BalanceShell>}
