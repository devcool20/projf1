import { pitWallThreads } from "@/lib/mock-data";

export default function PitWallPage() {
  return (
    <div>
      <div className="mb-4 border-b border-secondary/20 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-secondary">Pit Wall</p>
        <h2 className="font-headline text-3xl font-bold">Live Threads</h2>
      </div>

      <section className="space-y-3">
        {pitWallThreads.map((thread) => (
          <article key={thread.id} className="dashboard-panel p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-xl">{thread.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{thread.summary}</p>
              </div>
              <span
                className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] ${
                  thread.urgency === "high"
                    ? "border-alert-red/40 bg-alert-red/10 text-alert-red"
                    : "border-secondary/30 bg-secondary/10 text-secondary"
                }`}
              >
                {thread.urgency}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
              <span>{thread.participants} participants</span>
              <span>{thread.updatedAt}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
