"use client";

import { DriverStanding } from "@/lib/types";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

type Props = {
  driver: DriverStanding;
};

export function DriverTelemetryPanel({ driver }: Props) {
  const data = [
    { metric: "Aggression", value: driver.telemetryProfile.aggression },
    { metric: "Consistency", value: driver.telemetryProfile.consistency },
    { metric: "Tech", value: driver.telemetryProfile.tech },
    { metric: "Reaction", value: driver.telemetryProfile.reaction },
  ];

  return (
    <section className="dashboard-panel mt-5 grid gap-4 p-4 lg:grid-cols-2">
      <div>
        <h3 className="font-headline text-xl">Telemetry Spider</h3>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke="#48474a" />
              <PolarAngleAxis
                dataKey="metric"
                stroke="#adaaad"
                tick={{ fontSize: 11, fill: "#adaaad", fontFamily: "var(--font-telemetry)" }}
              />
              <Radar dataKey="value" stroke="#7ef6ee" fill="#7ef6ee" fillOpacity={0.24} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="dashboard-panel grid place-items-center bg-surface-container-low p-6">
        <svg viewBox="0 0 380 200" className="w-full max-w-md">
          <path d="M20 100H360" stroke="#7ef6ee" strokeWidth="1.2" strokeDasharray="6 6" />
          <path d="M55 110L115 78H250L315 110Z" fill="none" stroke="#ff9b48" strokeWidth="2" />
          <circle cx="115" cy="122" r="20" fill="none" stroke="#7ef6ee" strokeWidth="2" />
          <circle cx="265" cy="122" r="20" fill="none" stroke="#7ef6ee" strokeWidth="2" />
          <path d="M145 78L160 58H220L238 78Z" fill="none" stroke="#ff725d" strokeWidth="2" />
        </svg>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
          {driver.name} {"//"} Chassis Wireframe
        </p>
      </div>
    </section>
  );
}
