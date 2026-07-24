'use client';

import Link from 'next/link';
import { Menu, Shield, UserCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRuntimeConfig } from '@/components/useRuntimeConfig';

const links = [
  { href: '/#queue', label: 'Queue' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/#patch', label: 'Patch' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('ENG');
  useEffect(() => { setLanguage(localStorage.getItem('trust-language') || 'ENG'); }, []);
  function switchLanguage() { const next = language === 'ENG' ? 'RU' : 'ENG'; setLanguage(next); localStorage.setItem('trust-language', next); document.documentElement.lang = next === 'ENG' ? 'en' : 'ru'; }
  const config = useRuntimeConfig();
  const visibleLinks = config?.content.navLinks || links;
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-trust-black/80 backdrop-blur-2xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-trust-violet shadow-glow transition hover:scale-105">
            <Shield size={22} />
          </span>
          <span className="text-xl font-black tracking-[.25em]">TRUST</span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-zinc-300 md:flex">
          {visibleLinks.map((link) => (
            <Link className="transition hover:-translate-y-0.5 hover:text-white" key={link.href} href={link.href}>
              {language === 'RU' ? ({ Queue: 'Очередь', Leaderboard: 'Рейтинг', Patch: 'Патч', Profile: 'Профиль' } as Record<string,string>)[link.label] || link.label : link.label}
            </Link>
          ))}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <button className="rounded-full bg-white px-5 py-2 text-sm font-bold text-trust-black transition hover:bg-trust-soft">{language === 'RU' ? 'Подключить Steam' : 'Connect Steam'}</button>
          <Link aria-label="Open profile" href="/profile" className="rounded-full border border-white/10 bg-white/5 p-2 text-trust-soft transition hover:border-trust-soft hover:bg-trust-violet/20">
            <UserCircle />
          </Link>
          <button aria-label="Switch language" onClick={switchLanguage} className="rounded-full border border-trust-soft/30 bg-trust-violet/10 px-3 py-2 text-xs font-black text-trust-soft">{language}</button>
        </div>
        <button aria-label="Toggle menu" className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </nav>
      {open && (
        <div className="grid gap-3 border-t border-white/10 px-4 py-4 md:hidden">
          {[...visibleLinks, { href: '/profile', label: 'Profile' }].map((link) => (
            <Link onClick={() => setOpen(false)} className="rounded-2xl bg-white/5 p-3 transition hover:bg-white/10" key={link.href} href={link.href}>
              {language === 'RU' ? ({ Queue: 'Очередь', Leaderboard: 'Рейтинг', Patch: 'Патч', Profile: 'Профиль' } as Record<string,string>)[link.label] || link.label : link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
