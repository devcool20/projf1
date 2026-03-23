"use client";

import { useStreamingNumber } from "@/hooks/use-streaming-number";
import { liveStandings, pitStops, telemetryStats } from "@/lib/mock-data";
import { usePathname } from "next/navigation";

export function ContextSidebar() {
  const pathname = usePathname();
  const speed = useStreamingNumber(309, 316, 312);
  const ers = useStreamingNumber(72, 82, 76);
  const rpm = useStreamingNumber(11520, 11920, 11740);

  return (
    <aside className="thin-scrollbar hidden h-[calc(100vh-4rem)] overflow-y-auto border-l border-outline-variant/20 bg-surface-container-low p-4 xl:block">
      <h3 className="font-headline text-lg font-semibold">Live Telemetry</h3>
      <div className="mt-4 space-y-2">
        <div className="dashboard-panel p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Speed</p>
          <p className="font-mono text-2xl text-secondary">{speed} KPH</p>
        </div>
        <div className="dashboard-panel p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">ERS</p>
          <p className="font-mono text-2xl text-primary">{ers}%</p>
        </div>
        <div className="dashboard-panel p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">RPM</p>
          <p className="font-mono text-2xl text-tertiary">{rpm}</p>
        </div>
      </div>

      <div className="mt-6 dashboard-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">P1-P3</p>
        <div className="mt-2 space-y-2">
          {liveStandings.map((standing) => (
            <div key={standing.driver} className="flex items-center justify-between text-sm">
              <span className="font-headline">{standing.position}. {standing.driver}</span>
              <span className="font-mono text-[11px] text-on-surface-variant">{standing.gap}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 dashboard-panel p-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Pit Stop Timings</p>
        <div className="mt-2 space-y-2">
          {pitStops.map((stop) => (
            <div key={stop.driver} className="flex items-center justify-between text-sm">
              <span className="font-headline">{stop.driver} L{stop.lap}</span>
              <span className="font-mono text-[11px] text-secondary">{stop.stationarySeconds.toFixed(2)}s</span>
            </div>
          ))}
        </div>
      </div>

      {pathname === "/telemetry" && (
        <div className="mt-6 dashboard-panel p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Signal Bands</p>
          <div className="mt-2 space-y-2">
            {telemetryStats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-on-surface-variant">{stat.label}</span>
                <span className="font-mono text-[11px]">{stat.value}{stat.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
