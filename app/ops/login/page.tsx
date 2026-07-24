import type { Metadata } from 'next';
import LoginForm from '@/components/ops/LoginForm';
export const metadata: Metadata = { title:'TRUST Ops Login', robots:{ index:false, follow:false } };
export default function Page(){ return <LoginForm emailPlaceholder={process.env.ADMIN_EMAIL || 'Admin email'} />; }
