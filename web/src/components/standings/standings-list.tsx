"use client";

import { motion } from "framer-motion";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor, getNationalityFlag } from "@/lib/team-colors";

type Props = {
  drivers: ApiDriverStanding[];
  selectedCode: string;
  onSelect: (code: string) => void;
};

export function StandingsList({ drivers, selectedCode, onSelect }: Props) {
  const maxPoints = drivers[0]?.points ?? 1;

  return (
    <section className="dashboard-panel mt-4 overflow-hidden">
      <div className="grid grid-cols-[3rem_1fr_10rem_5rem_6rem] gap-x-2 border-b border-outline-variant/20 px-4 py-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">POS</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">DRIVER</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">TEAM</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right">NAT</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right">PTS</span>
      </div>

      <div className="thin-scrollbar max-h-[420px] overflow-y-auto">
        {drivers.map((driver, i) => {
          const tc = getTeamColor(driver.teamName);
          const isSelected = selectedCode === driver.driverCode;
          const barWidth = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;

          return (
            <motion.button
              key={driver.driverCode}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02, duration: 0.3 }}
              onClick={() => onSelect(driver.driverCode)}
              className={`group relative grid w-full grid-cols-[3rem_1fr_10rem_5rem_6rem] items-center gap-x-2 px-4 py-2.5 text-left transition-colors ${
                isSelected
                  ? "bg-secondary/8 border-l-2 border-l-secondary"
                  : "border-l-2 border-l-transparent hover:bg-surface-container-high/60"
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 opacity-[0.06] transition-all"
                style={{ width: `${barWidth}%`, background: tc.accent }}
              />

              <span className="relative z-10 font-mono text-sm font-bold" style={{ color: tc.accent }}>
                {String(driver.position).padStart(2, "0")}
              </span>

              <span className="relative z-10">
                <span className="font-headline text-sm font-semibold">{driver.driverName}</span>
                <span className="ml-2 font-mono text-[10px] text-on-surface-variant">{driver.driverCode}</span>
              </span>

              <span className="relative z-10 font-mono text-[11px]" style={{ color: tc.accent }}>
                {driver.teamName}
              </span>

              <span className="relative z-10 text-right font-mono text-[11px] text-on-surface-variant">
                {getNationalityFlag(driver.nationality)}
              </span>

              <span className="relative z-10 text-right font-mono text-sm font-bold">
                {driver.points}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
