import { DriverStanding } from "@/lib/types";

type Props = {
  drivers: DriverStanding[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function StandingsList({ drivers, selectedId, onSelect }: Props) {
  return (
    <section className="dashboard-panel mt-5 p-3">
      <h3 className="font-headline text-xl">Constructor&apos;s List</h3>
      <div className="mt-3 space-y-2">
        {drivers.map((driver) => {
          const selected = selectedId === driver.id;

          return (
            <button
              key={driver.id}
              onClick={() => onSelect(driver.id)}
              className={`flex w-full items-center justify-between border px-3 py-2 text-left hover:scale-[1.01] ${
                selected
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-outline-variant/30 bg-surface-container-low text-on-surface"
              }`}
            >
              <span className="font-headline text-sm">
                P{driver.position} {driver.name}
              </span>
              <span className="font-mono text-xs">{driver.points} pts</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
