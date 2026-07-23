import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MatchmakingProvider } from '@/components/MatchmakingProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TRUST — Dota 2 Competitive Platform',
  description: 'Modern esports matchmaking prototype for Dota 2 players.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className={inter.className}><MatchmakingProvider>{children}</MatchmakingProvider></body></html>;
}
