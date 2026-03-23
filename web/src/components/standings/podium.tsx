"use client";

import { motion } from "framer-motion";
import { Crown, ChevronUp, ChevronDown, Minus } from "lucide-react";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor, getNationalityFlag } from "@/lib/team-colors";

type Props = {
  topThree: ApiDriverStanding[];
  selectedCode: string;
  onSelect: (code: string) => void;
};

const podiumOrder = [1, 0, 2] as const;
const podiumHeights = ["h-40", "h-48", "h-36"];
const delays = [0.15, 0, 0.25];

export function Podium({ topThree, selectedCode, onSelect }: Props) {
  if (topThree.length < 3) return null;
  const ordered = podiumOrder.map((i) => topThree[i]);

  return (
    <section className="flex items-end justify-center gap-3 pb-2 pt-4">
      {ordered.map((driver, visualIdx) => {
        const tc = getTeamColor(driver.teamName);
        const isSelected = selectedCode === driver.driverCode;
        const isP1 = driver.position === 1;

        return (
          <motion.button
            key={driver.driverCode}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delays[visualIdx], duration: 0.45, ease: "easeOut" }}
            whileHover={{ scale: 1.03, y: -4 }}
            onClick={() => onSelect(driver.driverCode)}
            className={`relative flex ${podiumHeights[visualIdx]} w-44 flex-col items-center justify-end rounded-t-lg border px-3 pb-4 pt-6 transition-all ${
              isSelected
                ? "border-secondary/60 shadow-[0_0_24px_rgba(126,246,238,0.2)]"
                : "border-outline-variant/25 hover:border-outline-variant/50"
            }`}
            style={{ background: tc.bg }}
          >
            {isP1 && (
              <Crown className="absolute -top-3 h-6 w-6 text-primary" strokeWidth={2.2} />
            )}

            <div
              className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold"
              style={{ background: tc.accent, color: "#0e0e10" }}
            >
              {driver.position}
            </div>

            <p className="font-headline text-lg font-bold leading-tight">{driver.driverName}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              {getNationalityFlag(driver.nationality)} {driver.driverCode}
            </p>
            <p className="mt-1 font-mono text-xs" style={{ color: tc.accent }}>
              {driver.teamName}
            </p>
            <p className="mt-2 font-mono text-2xl font-bold" style={{ color: tc.accent }}>
              {driver.points}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">PTS</p>
          </motion.button>
        );
      })}
    </section>
  );
}
