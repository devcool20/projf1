"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor, getNationalityFlag } from "@/lib/team-colors";

type Props = {
  drivers: ApiDriverStanding[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onOpenDriver?: (code: string) => void;
  leaderPoints?: number;
};

function getAvatarSrc(driverName: string): string {
  const firstName = driverName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return `/api/avatar/${firstName}`;
}

export function StandingsList({ drivers, selectedCode, onSelect, onOpenDriver, leaderPoints }: Props) {
  const maxPoints = leaderPoints ?? drivers[0]?.points ?? 1;
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [popupY, setPopupY] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const handlePointerEnter = useCallback((code: string, e: React.PointerEvent) => {
    if (e.pointerType === "mouse") {
      const rect = listRef.current?.getBoundingClientRect();
      const rowRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopupY(rowRect.top - (rect?.top ?? 0));
      setHoveredCode(code);
    }
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredCode(null);
  }, []);

  const hoveredDriver = hoveredCode ? drivers.find((d) => d.driverCode === hoveredCode) : null;
  const hoveredTc = hoveredDriver ? getTeamColor(hoveredDriver.teamName) : null;

  return (
    <section className="dashboard-panel relative mt-5 overflow-hidden rounded-[24px]" ref={listRef}>
      <div className="grid grid-cols-[2.4rem_minmax(0,1fr)_3.8rem] gap-x-2 border-b border-white/15 px-3 py-2 sm:grid-cols-[2.8rem_minmax(0,1fr)_9.5rem_4.4rem_4.6rem] sm:px-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">POS</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant min-w-0">DRIVER</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right sm:hidden">PTS</span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant sm:block">TEAM</span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right sm:block">NAT</span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant text-right sm:block">PTS</span>
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
              whileHover={{ scale: 1.01 }}
              onClick={() => {
                onSelect(driver.driverCode);
                onOpenDriver?.(driver.driverCode);
              }}
              onPointerEnter={(e) => handlePointerEnter(driver.driverCode, e)}
              onPointerLeave={handlePointerLeave}
              className={`group relative grid w-full grid-cols-[2.4rem_minmax(0,1fr)_3.8rem] items-center gap-x-2 px-3 py-2.5 text-left transition-all sm:grid-cols-[2.8rem_minmax(0,1fr)_9.5rem_4.4rem_4.6rem] sm:px-4 ${
                isSelected
                  ? "border-l-2 border-l-secondary bg-white/10"
                  : "border-l-2 border-l-transparent hover:bg-white/8"
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
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="font-headline text-sm font-semibold truncate">{driver.driverName}</span>
                  <span className="font-mono text-[10px] text-on-surface-variant whitespace-nowrap">{driver.driverCode}</span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[10px] sm:hidden" style={{ color: tc.accent }}>
                  {driver.teamName} · {getNationalityFlag(driver.nationality)}
                </p>
              </div>

              <span
                className="relative z-10 hidden truncate font-mono text-[11px] whitespace-nowrap overflow-hidden sm:block"
                style={{ color: tc.accent }}
                title={driver.teamName}
              >
                {driver.teamName}
              </span>

              <span className="relative z-10 hidden text-right font-mono text-[11px] text-on-surface-variant sm:block">
                {getNationalityFlag(driver.nationality)}
              </span>

              <span className="relative z-10 text-right font-mono text-sm font-bold">
                {driver.points}
              </span>

              <AnimatePresence>
                {hoveredCode === driver.driverCode && (
                  <motion.video
                    key={`row-cutout-${driver.driverCode}`}
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 0.9, width: 68 }}
                    exit={{ opacity: 0, width: 0 }}
                    src={getAvatarSrc(driver.driverName)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="pointer-events-none absolute right-1 top-1 hidden h-[calc(100%-8px)] rounded-md object-cover md:block"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Chibi video popup — floats beside the hovered row */}
      <AnimatePresence>
        {hoveredDriver && hoveredTc && (
          <motion.div
            key={hoveredDriver.driverCode}
            initial={{ opacity: 0, scale: 0.8, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute right-3 z-50 hidden w-36 overflow-hidden rounded-lg border shadow-2xl shadow-black/50 md:block"
            style={{
              top: Math.max(8, popupY - 40),
              borderColor: `${hoveredTc.accent}50`,
              background: "#0e0e10",
            }}
          >
            <video
              key={getAvatarSrc(hoveredDriver.driverName)}
              src={getAvatarSrc(hoveredDriver.driverName)}
              className="aspect-square w-full scale-110 object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="none"
            />
            <div
              className="px-2.5 py-1.5"
              style={{ background: hoveredTc.bg }}
            >
              <p className="font-headline text-xs font-bold text-white/95">{hoveredDriver.driverName}</p>
              <p className="font-mono text-[9px]" style={{ color: hoveredTc.accent }}>
                {hoveredDriver.teamName} — P{hoveredDriver.position}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
