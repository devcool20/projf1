"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown } from "lucide-react";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor, getNationalityFlag } from "@/lib/team-colors";

type Props = {
  topThree: ApiDriverStanding[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onOpenDriver?: (code: string) => void;
};

const podiumOrder = [1, 0, 2] as const;
const podiumHeights = ["h-40", "h-48", "h-36"];
const delays = [0.15, 0, 0.25];

function getAvatarSrc(driverName: string): string {
  const firstName = driverName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return `/api/avatar/${firstName}`;
}

export function Podium({ topThree, selectedCode, onSelect, onOpenDriver }: Props) {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  const handlePointerEnter = useCallback((code: string, e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const rect = sectionRef.current?.getBoundingClientRect();
    const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect) {
      setPopupPos({
        x: cardRect.left - rect.left + cardRect.width / 2 - 72,
        y: cardRect.top - rect.top - 170,
      });
    }
    setHoveredCode(code);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHoveredCode(null);
  }, []);

  if (topThree.length < 3) return null;
  const ordered = podiumOrder.map((i) => topThree[i]);

  const hoveredDriver = hoveredCode ? ordered.find((d) => d.driverCode === hoveredCode) : null;
  const hoveredTc = hoveredDriver ? getTeamColor(hoveredDriver.teamName) : null;

  return (
    <section className="relative flex items-end justify-center gap-2 overflow-x-clip pb-2 pt-4 sm:gap-3" ref={sectionRef}>
      {ordered.map((driver, visualIdx) => {
        const tc = getTeamColor(driver.teamName);
        const isSelected = selectedCode === driver.driverCode;
        const isP1 = driver.position === 1;

        return (
          <div key={driver.driverCode} className="flex flex-col items-center">
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays[visualIdx], duration: 0.45, ease: "easeOut" }}
              whileHover={{ scale: 1.03, y: -4 }}
              onClick={() => {
                onSelect(driver.driverCode);
                onOpenDriver?.(driver.driverCode);
              }}
              onPointerEnter={(e) => handlePointerEnter(driver.driverCode, e)}
              onPointerLeave={handlePointerLeave}
              className={`relative flex ${podiumHeights[visualIdx]} w-[31vw] min-w-[104px] max-w-[176px] flex-col rounded-t-lg border px-2.5 pb-3 pt-3 transition-all sm:px-3 sm:pb-4 ${
                isSelected
                  ? "border-secondary/60 shadow-[0_0_24px_rgba(126,246,238,0.2)]"
                  : "border-outline-variant/25 hover:border-outline-variant/50"
              }`}
              style={{ background: tc.bg }}
            >
              {isP1 && (
                <Crown
                  className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 text-primary"
                  strokeWidth={2.2}
                />
              )}

              <div className="flex min-h-0 flex-1 flex-col items-center justify-end text-center">
                <p className="line-clamp-2 font-headline text-base font-bold leading-tight text-slate-900 sm:text-lg">
                  {driver.driverName}
                </p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-700">
                  {getNationalityFlag(driver.nationality)} {driver.driverCode}
                </p>
                <p className="mt-1 font-mono text-xs" style={{ color: tc.accent }}>
                  {driver.teamName}
                </p>
                <p className="mt-2 font-mono text-2xl font-bold" style={{ color: tc.accent }}>
                  {driver.points}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">PTS</p>
              </div>
            </motion.button>

            <div className="mt-2 flex h-6 w-[31vw] min-w-[104px] max-w-[176px] items-center justify-center">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                style={{ background: tc.accent, color: "#0e0e10" }}
              >
                {driver.position}
              </div>
            </div>
          </div>
        );
      })}

      {/* Chibi video popup — floats above the hovered podium card */}
      <AnimatePresence>
        {hoveredDriver && hoveredTc && (
          <motion.div
            key={hoveredDriver.driverCode}
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none absolute z-50 w-36 overflow-hidden rounded-lg border shadow-2xl shadow-black/50"
            style={{
              left: popupPos.x,
              top: Math.max(0, popupPos.y),
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
            <div className="px-2.5 py-1.5" style={{ background: hoveredTc.bg }}>
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
