import type { Metadata } from 'next';
import OpsDashboard from '@/components/ops/OpsDashboard';
export const metadata: Metadata = { title:'TRUST Ops', robots:{ index:false, follow:false } };
export default function Page(){ return <OpsDashboard />; }
