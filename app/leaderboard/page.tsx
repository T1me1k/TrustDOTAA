import { Card, Shell } from '@/components/Shell';
import { leaderboard } from '@/lib/data';

export default function LeaderboardPage() {
  return (
    <Shell>
      <Card>
        <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[.3em] text-zinc-500">Season One</p>
            <h1 className="text-5xl font-black text-gradient">TRUST Leaderboard</h1>
          </div>
          <p className="max-w-xl text-zinc-400">Рейтинг учитывает победы, качество ролей, силу оппонентов и Trust Score для устойчивого competitive matchmaking.</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <div className="hidden grid-cols-6 bg-white/5 p-4 text-xs uppercase tracking-[.2em] text-zinc-500 md:grid">
            <span>Place</span><span>Player</span><span>Region</span><span>Rating</span><span>Win Rate</span><span>Trust</span>
          </div>
          {leaderboard.map((player) => (
            <div className="grid gap-2 border-t border-white/10 p-4 transition hover:bg-trust-violet/10 md:grid-cols-6" key={player.name}>
              <span className="font-black text-trust-soft">#{player.place}</span>
              <span className="font-bold">{player.name}</span>
              <span className="text-zinc-400">{player.region}</span>
              <span className="font-black">{player.rating}</span>
              <span>{player.winRate}</span>
              <span className="text-emerald-300">{player.trustScore}</span>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}
