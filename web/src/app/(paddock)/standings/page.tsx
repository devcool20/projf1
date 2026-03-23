"use client";

import { DriverTelemetryPanel } from "@/components/standings/driver-telemetry-panel";
import { Podium } from "@/components/standings/podium";
import { StandingsList } from "@/components/standings/standings-list";
import { driverStandings } from "@/lib/mock-data";
import { useMemo, useState } from "react";

export default function StandingsPage() {
  const [selectedId, setSelectedId] = useState(driverStandings[0].id);
  const selectedDriver = useMemo(
    () => driverStandings.find((driver) => driver.id === selectedId) ?? driverStandings[0],
    [selectedId],
  );

  return (
    <div>
      <div className="mb-4 border-b border-secondary/20 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-secondary">The Constructor&apos;s Grid</p>
        <h2 className="font-headline text-3xl font-bold">Championship Standings</h2>
      </div>

      <Podium topThree={driverStandings.slice(0, 3)} />
      <StandingsList drivers={driverStandings.slice(3)} selectedId={selectedId} onSelect={setSelectedId} />
      <DriverTelemetryPanel driver={selectedDriver} />
    </div>
  );
}
