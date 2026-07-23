import { Card, Shell } from '@/components/Shell';
import { heroes, matches, player } from '@/lib/data';

export default function ProfilePage() {
  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <Card>
          <div className="flex items-center gap-4">
            <div className="grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-trust-violet to-trust-soft text-4xl font-black shadow-glow">VL</div>
            <div>
              <p className="text-sm uppercase tracking-[.3em] text-zinc-500">Player profile</p>
              <h1 className="text-4xl font-black">{player.name}</h1>
              <p className="text-trust-soft">{player.rank}</p>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[
              ['TRUST Rating', player.rating],
              ['Trust Score', player.trustScore],
              ['Win Rate', player.winRate],
              ['Matches', player.matches],
              ['KDA', player.kda],
              ['Streak', player.streak],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-white/5 p-4 transition hover:-translate-y-1 hover:bg-white/10" key={label}>
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-3xl font-black">Favorite heroes</h2>
          {heroes.map((hero) => (
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-trust-panel/70 p-4 transition hover:bg-white/10" key={hero.name}>
              <span className="font-bold">{hero.name}</span>
              <span className="text-sm text-zinc-400">{hero.games} games · <b className="text-trust-soft">{hero.wr}</b></span>
            </div>
          ))}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-5 text-3xl font-black">Recent match history</h2>
          {matches.map((match) => (
            <div className="mb-3 grid gap-2 rounded-2xl bg-white/5 p-4 transition hover:bg-white/10 sm:grid-cols-6 sm:items-center" key={match.id}>
              <b>{match.hero}</b>
              <span className="text-zinc-400">{match.mode}</span>
              <span className={match.result === 'Victory' ? 'text-emerald-300' : 'text-rose-300'}>{match.result}</span>
              <span>{match.score}</span>
              <span className={match.rating.startsWith('+') ? 'text-emerald-300' : 'text-rose-300'}>{match.rating}</span>
              <span className="text-sm text-zinc-500">{match.time}</span>
            </div>
          ))}
        </Card>
      </div>
    </Shell>
  );
}
