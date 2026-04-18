"use client";

import { motion } from "framer-motion";
import { StarIcon } from "@heroicons/react/24/solid";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/team-colors";

type Props = {
  topThree: ApiDriverStanding[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onOpenDriver?: (code: string) => void;
};

const podiumOrder = [1, 0, 2] as const;
const podiumHeights = ["h-36 sm:h-40", "h-40 sm:h-48", "h-32 sm:h-36"];

export function Podium({ topThree, selectedCode, onSelect, onOpenDriver }: Props) {
  if (topThree.length < 3) return null;
  const ordered = podiumOrder.map((i) => topThree[i]);

  return (
    <section className="relative flex items-end justify-center gap-1.5 px-1 pb-2 pt-4 sm:gap-3 sm:px-0">
      {ordered.map((driver, visualIdx) => {
        const tc = getTeamColor(driver.teamName);
        const isSelected = selectedCode === driver.driverCode;
        const isP1 = driver.position === 1;

        return (
          <div key={driver.driverCode} className="flex min-w-0 flex-1 flex-col items-center">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                onSelect(driver.driverCode);
                onOpenDriver?.(driver.driverCode);
              }}
              className={`relative flex ${podiumHeights[visualIdx]} w-full flex-col rounded-t-lg border px-2 pb-2.5 pt-3 transition-all sm:px-3 sm:pb-4 ${
                isSelected
                  ? "border-secondary/60 shadow-[0_0_24px_rgba(126,246,238,0.2)]"
                  : "border-outline-variant/25 hover:border-outline-variant/50"
              }`}
              style={{ background: tc.bg }}
            >
              {isP1 && (
                <StarIcon
                  className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 text-primary sm:h-6 sm:w-6"
                  aria-hidden
                />
              )}

              <div className="flex min-h-0 flex-1 flex-col items-center justify-end text-center">
                <p className="w-full wrap-break-word font-headline text-xs font-semibold leading-tight text-slate-900 sm:text-base">
                  {driver.driverName}
                </p>
                <p className="mt-0.5 w-full truncate text-[10px] font-medium sm:text-xs" style={{ color: tc.accent }}>
                  {driver.teamName}
                </p>
                <p className="mt-1.5 font-mono text-xl font-semibold sm:mt-2 sm:text-2xl" style={{ color: tc.accent }}>
                  {driver.points}
                </p>
                <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-on-surface-variant sm:text-[9px]">PTS</p>
              </div>
            </motion.button>

            <div className="mt-1.5 flex h-5 w-full items-center justify-center sm:mt-2 sm:h-6">
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold sm:h-6 sm:w-6 sm:text-[10px]"
                style={{ background: tc.accent, color: "#0e0e10" }}
              >
                {driver.position}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
