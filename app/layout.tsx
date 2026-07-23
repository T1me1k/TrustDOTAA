import type { Metadata } from 'next';
import { MatchmakingProvider } from '@/components/MatchmakingProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TRUST — Dota 2 Competitive Platform',
  description: 'Modern esports matchmaking prototype for Dota 2 players.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><MatchmakingProvider>{children}</MatchmakingProvider></body></html>;
}
