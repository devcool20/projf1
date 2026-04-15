"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/team-colors";
import { fastFade, listContainerVariants, listItemVariants } from "@/components/motion/premium-motion";

type Props = {
  drivers: ApiDriverStanding[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onOpenDriver?: (code: string) => void;
  leaderPoints?: number;
};

export function StandingsList({ drivers, selectedCode, onSelect, onOpenDriver, leaderPoints }: Props) {
  const maxPoints = leaderPoints ?? drivers[0]?.points ?? 1;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const handlePointerEnter = useCallback((code: string, e: React.PointerEvent) => {
    if (e.pointerType === "mouse") {
      setHoveredCode(code);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredCode(null);
  }, []);

  return (
    <section className="card-surface relative mt-5 overflow-hidden rounded-[24px]">
      <div className="grid grid-cols-[2.4rem_minmax(0,1fr)_3.8rem] gap-x-2 border-b border-white/15 px-3 py-2 sm:grid-cols-[2.8rem_minmax(0,1fr)_11rem_4.6rem] sm:px-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">POS</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant min-w-0">DRIVER</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right sm:hidden">PTS</span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant sm:block">TEAM</span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right sm:block">PTS</span>
      </div>

      <motion.div
        className="premium-scrollbar max-h-[420px] overflow-y-auto pb-4"
        variants={listContainerVariants}
        initial="hidden"
        animate="show"
      >
        {drivers.map((driver) => {
          const tc = getTeamColor(driver.teamName);
          const isSelected = selectedCode === driver.driverCode;
          const barWidth = maxPoints > 0 ? (driver.points / maxPoints) * 100 : 0;

          return (
            <motion.button
              key={driver.driverCode}
              variants={listItemVariants}
              transition={fastFade}
              onClick={() => {
                onSelect(driver.driverCode);
                onOpenDriver?.(driver.driverCode);
              }}
              onPointerEnter={(e) => handlePointerEnter(driver.driverCode, e)}
              onPointerLeave={handlePointerLeave}
              className={`group relative grid w-full grid-cols-[2.4rem_minmax(0,1fr)_3.8rem] items-center gap-x-2 px-3 py-2.5 text-left transition-all sm:grid-cols-[2.8rem_minmax(0,1fr)_11rem_4.6rem] sm:px-4 ${
                isSelected
                  ? "border-l-2 border-l-secondary bg-slate-100/95"
                  : "border-l-2 border-l-transparent hover:bg-slate-100/75"
              }`}
              style={{ boxShadow: hoveredCode === driver.driverCode ? `inset 0 0 0 1px ${tc.accent}30` : undefined }}
            >
              <div
                className="absolute inset-y-0 left-0 opacity-[0.06] transition-all"
                style={{ width: `${barWidth}%`, background: tc.accent }}
              />

              <span className="relative z-10 font-mono text-sm font-bold" style={{ color: tc.accent }}>
                {String(driver.position).padStart(2, "0")}
              </span>

              <div className="relative z-10 min-w-0">
                <span className="block truncate font-headline text-sm font-semibold">{driver.driverName}</span>
                <p className="mt-0.5 truncate font-mono text-[10px] sm:hidden" style={{ color: tc.accent }}>
                  {driver.teamName}
                </p>
              </div>

              <span
                className="relative z-10 hidden truncate font-mono text-[11px] whitespace-nowrap overflow-hidden sm:block"
                style={{ color: tc.accent }}
                title={driver.teamName}
              >
                {driver.teamName}
              </span>

              <span className="relative z-10 text-right font-mono text-sm font-bold">
                {driver.points}
              </span>

            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}
