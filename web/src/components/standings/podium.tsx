import Image from "next/image";
import { DriverStanding } from "@/lib/types";

type Props = {
  topThree: DriverStanding[];
};

export function Podium({ topThree }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {topThree.map((driver) => (
        <article
          key={driver.id}
          className="dashboard-panel group overflow-hidden p-3 transition hover:scale-[1.02]"
          style={{ boxShadow: `0 0 20px ${driver.accent}30` }}
        >
          <div className="relative h-44">
            <Image src={driver.avatarUrl} alt={driver.name} fill className="object-cover" />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">P{driver.position}</p>
              <p className="font-headline text-lg font-semibold">{driver.name}</p>
              <p className="font-mono text-[11px] text-on-surface-variant">{driver.team}</p>
            </div>
            <p className="font-mono text-sm text-secondary">{driver.points} pts</p>
          </div>
        </article>
      ))}
    </section>
  );
}
