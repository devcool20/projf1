import Link from "next/link";
import { driverStandings, pitWallThreads, telemetryStats } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <section className="dashboard-panel p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Mission Control</p>
        <h2 className="mt-2 font-headline text-4xl font-bold tracking-tight">Paddock OS Dashboard</h2>
        <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
          Real-time race intelligence with social comms, telemetry overlays, strategic timelines, and gear loadouts.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {telemetryStats.map((stat) => (
          <article key={stat.label} className="dashboard-panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">{stat.label}</p>
            <p className="mt-2 font-mono text-3xl text-secondary">{stat.value}{stat.unit}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="dashboard-panel p-4">
          <h3 className="font-headline text-xl">Top Drivers</h3>
          <div className="mt-3 space-y-2">
            {driverStandings.slice(0, 3).map((driver) => (
              <div key={driver.id} className="flex items-center justify-between border border-outline-variant/20 px-3 py-2">
                <span className="font-headline">P{driver.position} {driver.name}</span>
                <span className="font-mono text-xs text-on-surface-variant">{driver.points} pts</span>
              </div>
            ))}
          </div>
        </article>

        <article className="dashboard-panel p-4">
          <h3 className="font-headline text-xl">Hot Threads</h3>
          <div className="mt-3 space-y-2">
            {pitWallThreads.map((thread) => (
              <div key={thread.id} className="border border-outline-variant/20 px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="font-headline text-sm">{thread.title}</p>
                  <p className="font-mono text-[10px] text-on-surface-variant">{thread.updatedAt}</p>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">{thread.summary}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="dashboard-panel flex flex-wrap gap-3 p-4">
        <Link href="/comms" className="border border-primary/40 px-3 py-2 font-headline text-xs uppercase tracking-[0.2em] hover:bg-primary/10">
          Open Live Comms
        </Link>
        <Link href="/standings" className="border border-secondary/40 px-3 py-2 font-headline text-xs uppercase tracking-[0.2em] hover:bg-secondary/10">
          View Standings
        </Link>
        <Link href="/parc-ferme" className="border border-tertiary/40 px-3 py-2 font-headline text-xs uppercase tracking-[0.2em] hover:bg-tertiary/10">
          Enter Parc Ferme
        </Link>
      </section>
    </div>
  );
}
