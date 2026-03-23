"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { ApiTeamStanding, ApiDriverStanding } from "@/lib/types";
import { getTeamColor } from "@/lib/team-colors";

type Props = {
  teams: ApiTeamStanding[];
  drivers: ApiDriverStanding[];
};

export function ConstructorsView({ teams, drivers }: Props) {
  const maxPoints = teams[0]?.points ?? 1;

  return (
    <div className="space-y-3">
      {teams.map((team, i) => {
        const tc = getTeamColor(team.teamName);
        const barWidth = maxPoints > 0 ? (team.points / maxPoints) * 100 : 0;
        const teamDrivers = drivers.filter((d) => d.teamName === team.teamName);

        return (
          <motion.div
            key={team.teamName}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.35 }}
            className="dashboard-panel group relative overflow-hidden p-4 transition-all hover:scale-[1.005]"
          >
            <div
              className="absolute inset-y-0 left-0 opacity-[0.08]"
              style={{ width: `${barWidth}%`, background: tc.accent }}
            />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm font-black"
                  style={{ background: tc.bg, color: tc.accent, border: `1px solid ${tc.accent}40` }}
                >
                  {String(team.position).padStart(2, "0")}
                </div>
                <div>
                  <h4 className="font-headline text-lg font-bold" style={{ color: tc.accent }}>
                    {team.teamName}
                  </h4>
                  <div className="mt-0.5 flex items-center gap-1 text-on-surface-variant">
                    <Users className="h-3 w-3" />
                    <span className="font-mono text-[10px]">
                      {teamDrivers.map((d) => d.driverCode).join(" · ") || "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-mono text-2xl font-bold" style={{ color: tc.accent }}>
                  {team.points}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">PTS</p>
              </div>
            </div>

            {/* Driver breakdown */}
            {teamDrivers.length > 0 && (
              <div className="relative z-10 mt-3 flex gap-2">
                {teamDrivers.map((d) => (
                  <div
                    key={d.driverCode}
                    className="flex items-center gap-2 rounded border border-outline-variant/20 bg-surface-container-low/80 px-3 py-1.5"
                  >
                    <span className="font-mono text-[10px] font-bold" style={{ color: tc.accent }}>
                      {d.driverCode}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant">P{d.position}</span>
                    <span className="font-mono text-xs font-semibold">{d.points} pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Points bar at bottom */}
            <div className="relative z-10 mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: tc.accent }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ delay: i * 0.04 + 0.2, duration: 0.7, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
