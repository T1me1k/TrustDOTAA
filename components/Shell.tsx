import { Nav } from '@/components/Nav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-trust-black bg-radial-trust pt-20 text-white">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:64px_64px]" />
      <Nav />
      <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</div>
    </main>
  );
}

export function Card({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`glass rounded-3xl p-5 md:p-7 ${className}`}>{children}</section>;
}

export function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-trust-soft/25 bg-trust-violet/10 px-3 py-1 text-xs text-trust-soft">{children}</span>;
}
