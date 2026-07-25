'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  FileJson,
  Flag,
  Gamepad2,
  GitPullRequest,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
} from 'lucide-react';

const opsLinks = [
  ['/ops?section=Overview', 'Overview', LayoutDashboard],
  ['/ops?section=Matchmaking', 'Matchmaking', Gamepad2],
  ['/ops?section=Feature%20Flags', 'Feature Flags', Flag],
  ['/ops?section=Players', 'Players', Users],
  ['/ops?section=Queues', 'Queues', ListChecks],
  ['/ops?section=Matches', 'Matches', BarChart3],
  ['/ops?section=Settings', 'Settings', Settings],
] as const;

const balanceLinks = [
  ['/ops/balance', 'Balance overview', SlidersHorizontal],
  ['/ops/balance/heroes', 'Heroes', Users],
  ['/ops/balance/patches', 'Balance patches', GitPullRequest],
  ['/ops/balance/review', 'Review Center', Shield],
  ['/ops/balance/import', 'Import / Export', FileJson],
  ['/ops/balance/audit', 'Balance audit', Activity],
] as const;

export default function BalanceShell({ admin, children }: { admin: string; children: React.ReactNode }) {
  const path = usePathname();

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    location.assign('/ops/login');
  }

  return <main className="min-h-screen bg-trust-black bg-radial-trust text-white">
    <div className="mx-auto grid min-h-screen max-w-[1800px] lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/10 bg-black/40 p-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-trust-violet shadow-glow"><Shield/></span>
          <div><p className="font-black tracking-[.25em]">TRUST OPS</p><p className="text-xs text-zinc-400">PRODUCTION ADMIN</p></div>
        </div>

        <p className="mb-2 mt-7 text-[11px] font-bold tracking-[.2em] text-zinc-500">CONTROL PLANE</p>
        <nav aria-label="TRUST Ops" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {opsLinks.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"><Icon size={16}/>{label}</Link>)}
        </nav>

        <p className="mb-2 mt-7 text-[11px] font-bold tracking-[.2em] text-trust-soft">GAME BALANCE</p>
        <nav aria-label="Game balance" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
          {balanceLinks.map(([href, label, Icon]) => {
            const active = path === href || (href !== '/ops/balance' && path.startsWith(`${href}/`));
            return <Link key={href} href={href} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${active ? 'bg-trust-violet shadow-glow' : 'bg-white/5 hover:bg-white/10'}`}><Icon size={16}/>{label}</Link>;
          })}
        </nav>

        <div className="mt-7 border-t border-white/10 pt-4 text-xs text-zinc-400">
          <p className="truncate text-white">{admin}</p>
          <p>Owner</p>
          <button onClick={logout} className="mt-3 flex gap-2 py-2"><LogOut size={15}/> Logout</button>
        </div>
      </aside>
      <section className="min-w-0 p-4 md:p-7">{children}</section>
    </div>
  </main>;
}
