"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChartBarIcon,
  FlagIcon,
  MapPinIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ApiDriverStanding } from "@/lib/types";
import { getTeamColor, getNationalityFlag } from "@/lib/team-colors";

type Props = {
  driver: ApiDriverStanding | null;
  allDrivers: ApiDriverStanding[];
};

export function DriverDetailPanel({ driver, allDrivers }: Props) {
  if (!driver) return null;

  const tc = getTeamColor(driver.teamName);
  const leader = allDrivers[0];
  const gap = leader ? leader.points - driver.points : 0;
  const teammates = allDrivers.filter(
    (d) => d.teamName === driver.teamName && d.driverCode !== driver.driverCode,
  );

  const positionSuffix =
    driver.position === 1 ? "st" : driver.position === 2 ? "nd" : driver.position === 3 ? "rd" : "th";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={driver.driverCode}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="dashboard-panel sticky top-0 space-y-4 p-5"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-on-surface-variant">Driver Profile</p>
            <h3 className="mt-1 font-headline text-2xl font-bold">{driver.driverName}</h3>
            <p className="mt-0.5 font-mono text-xs" style={{ color: tc.accent }}>
              {driver.teamName}
            </p>
          </div>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-lg font-headline text-2xl font-black"
            style={{ background: tc.bg, color: tc.accent, border: `1px solid ${tc.accent}40` }}
          >
            P{driver.position}
          </div>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={<TrophyIcon className="h-3.5 w-3.5" aria-hidden />}
            label="Points"
            value={String(driver.points)}
            accent={tc.accent}
          />
          <StatCard
            icon={<ChartBarIcon className="h-3.5 w-3.5" aria-hidden />}
            label="Position"
            value={`${driver.position}${positionSuffix}`}
            accent={tc.accent}
          />
          <StatCard
            icon={<FlagIcon className="h-3.5 w-3.5" aria-hidden />}
            label="Nationality"
            value={`${getNationalityFlag(driver.nationality)} ${driver.nationality}`}
            accent={tc.accent}
          />
          <StatCard
            icon={<MapPinIcon className="h-3.5 w-3.5" aria-hidden />}
            label="Gap to P1"
            value={gap === 0 ? "Leader" : `-${gap} pts`}
            accent={gap === 0 ? "#7ef6ee" : "#ff725d"}
          />
        </div>

        {/* Code Badge */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-20 items-center justify-center rounded font-mono text-2xl font-black tracking-widest"
            style={{ background: tc.bg, color: tc.accent, border: `1px solid ${tc.accent}30` }}
          >
            {driver.driverCode}
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">Driver Code</p>
            <p className="text-sm text-on-surface">{driver.driverName}</p>
          </div>
        </div>

        {/* Teammates */}
        {teammates.length > 0 && (
          <div>
            <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">
              <UsersIcon className="mr-1 inline h-3 w-3" aria-hidden />
              Teammate{teammates.length > 1 ? "s" : ""}
            </p>
            {teammates.map((tm) => (
              <div
                key={tm.driverCode}
                className="flex items-center justify-between rounded border border-outline-variant/20 bg-surface-container-low px-3 py-2"
              >
                <div>
                  <span className="font-headline text-sm">{tm.driverName}</span>
                  <span className="ml-2 font-mono text-[10px] text-on-surface-variant">{tm.driverCode}</span>
                </div>
                <span className="font-mono text-xs">P{tm.position} — {tm.points} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Points Bar Viz */}
        <div>
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">
            Points Share vs Leader
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface-container-high">
            <motion.div
              className="h-full rounded-full"
              style={{ background: tc.accent }}
              initial={{ width: 0 }}
              animate={{
                width: leader ? `${(driver.points / Math.max(leader.points, 1)) * 100}%` : "0%",
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-on-surface-variant">
            <span>0</span>
            <span>{leader?.points ?? 0} pts</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded border border-outline-variant/20 bg-surface-container-low px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-on-surface-variant">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="mt-1 font-mono text-lg font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
