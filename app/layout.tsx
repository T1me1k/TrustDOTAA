import type { Metadata } from 'next';
import { MatchmakingProvider } from '@/components/MatchmakingProvider';
import './globals.css';
import { cookies } from 'next/headers';
import { LocaleProvider } from '@/components/LocaleProvider';

export const metadata: Metadata = {
  title: 'TRUST — Dota 2 Competitive Platform',
  description: 'Modern esports matchmaking prototype for Dota 2 players.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = cookies().get('trust_locale')?.value === 'ru' ? 'ru' : 'en';
  return <html lang={locale}><body><LocaleProvider initialLocale={locale}><MatchmakingProvider>{children}</MatchmakingProvider></LocaleProvider></body></html>;
}
