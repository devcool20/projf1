import { profileData } from "@/lib/mock-data";

export default function ProfilePage() {
  return (
    <div className="space-y-5">
      <section className="dashboard-panel p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">The Super License</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-headline text-3xl font-bold">{profileData.name}</h2>
            <p className="font-mono text-xs text-on-surface-variant">{profileData.tag}</p>
          </div>
          <div className="flex gap-2">
            {profileData.verified && (
              <span className="border border-secondary/40 bg-secondary/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-secondary uppercase">
                Verified
              </span>
            )}
            <span className="border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-primary uppercase">
              Rookie {profileData.rookieYear}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="dashboard-panel p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Recovery Rate</p>
          <p className="mt-2 font-mono text-4xl text-secondary">{profileData.recoveryRate}%</p>
        </article>
        <article className="dashboard-panel p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Points</p>
          <p className="mt-2 font-mono text-4xl text-primary">{profileData.points}</p>
        </article>
        <article className="dashboard-panel p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Global Rank</p>
          <p className="mt-2 font-mono text-4xl text-tertiary">#{profileData.globalRank}</p>
        </article>
      </section>

      <section className="dashboard-panel p-4">
        <h3 className="font-headline text-xl">Sector VMax</h3>
        <div className="mt-3 space-y-2">
          {Object.entries(profileData.sectorVmax).map(([sector, value]) => {
            const percentage = Math.min(100, Math.round((value / 340) * 100));
            return (
              <div key={sector}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-mono uppercase">{sector}</span>
                  <span className="font-mono text-on-surface-variant">{value} KPH</span>
                </div>
                <div className="h-2 bg-surface-container-low">
                  <div className="h-2 bg-secondary" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-panel p-4">
        <h3 className="font-headline text-xl">Career Trajectory</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {profileData.milestones.map((milestone) => (
            <article key={milestone.title} className="border border-outline-variant/30 bg-surface-container-low px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">{milestone.year}</p>
              <p className="mt-1 font-headline text-sm">{milestone.title}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
