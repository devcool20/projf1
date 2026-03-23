"use client";

import { raceCalendar } from "@/lib/mock-data";
import { useStreamingNumber } from "@/hooks/use-streaming-number";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  CloudSun,
  Flag,
  Gauge,
  Radio,
  ShieldAlert,
  Timer,
  Waves,
} from "lucide-react";
import { type ComponentType, useMemo, useState } from "react";

type PositionRow = {
  pos: number;
  code: string;
  driver: string;
  team: string;
  gap: string;
  compound: "S" | "M" | "H";
  lastLap: string;
};

type RadioMessage = {
  id: string;
  at: string;
  source: string;
  code: string;
  severity: "normal" | "alert";
  message: string;
};

type StrategyCall = {
  id: string;
  title: string;
  target: string;
  confidence: number;
  window: string;
  detail: string;
};

const positionsSeed: PositionRow[] = [
  { pos: 1, code: "RUS", driver: "George Russell", team: "Mercedes", gap: "LEADER", compound: "M", lastLap: "1:33.288" },
  { pos: 2, code: "ANT", driver: "Kimi Antonelli", team: "Mercedes", gap: "+1.204", compound: "M", lastLap: "1:33.451" },
  { pos: 3, code: "LEC", driver: "Charles Leclerc", team: "Ferrari", gap: "+3.992", compound: "H", lastLap: "1:33.801" },
  { pos: 4, code: "HAM", driver: "Lewis Hamilton", team: "Ferrari", gap: "+5.117", compound: "H", lastLap: "1:33.852" },
  { pos: 5, code: "NOR", driver: "Lando Norris", team: "McLaren", gap: "+9.404", compound: "M", lastLap: "1:34.101" },
  { pos: 6, code: "GAS", driver: "Pierre Gasly", team: "Alpine", gap: "+12.772", compound: "M", lastLap: "1:34.269" },
  { pos: 7, code: "VER", driver: "Max Verstappen", team: "Red Bull Racing", gap: "+15.036", compound: "H", lastLap: "1:34.411" },
  { pos: 8, code: "LAW", driver: "Liam Lawson", team: "Racing Bulls", gap: "+19.680", compound: "M", lastLap: "1:34.702" },
  { pos: 9, code: "BEA", driver: "Oliver Bearman", team: "Haas F1 Team", gap: "+21.322", compound: "H", lastLap: "1:34.812" },
  { pos: 10, code: "PIA", driver: "Oscar Piastri", team: "McLaren", gap: "+23.780", compound: "H", lastLap: "1:34.915" },
];

const radios: RadioMessage[] = [
  {
    id: "r1",
    at: "L36",
    source: "Mercedes Race Engineer",
    code: "RUS",
    severity: "normal",
    message: "Grip curve stable. Target +0.2 in S2, no overtake risk this lap.",
  },
  {
    id: "r2",
    at: "L37",
    source: "Ferrari Strategy",
    code: "LEC",
    severity: "alert",
    message: "Traffic window opening. Box-box in two laps for medium undercut.",
  },
  {
    id: "r3",
    at: "L37",
    source: "McLaren Pit Wall",
    code: "NOR",
    severity: "normal",
    message: "SOC target +3%. Keep harvest mode through final sector.",
  },
  {
    id: "r4",
    at: "L38",
    source: "Race Control",
    code: "RC",
    severity: "alert",
    message: "Debris reported at turn 11. Yellow local flags, no SC expected.",
  },
];

const strategyCalls: StrategyCall[] = [
  {
    id: "s1",
    title: "Primary",
    target: "LEC / HAM",
    confidence: 86,
    window: "L40-L42",
    detail: "Double-stack risk is moderate. Split strategy lowers traffic penalty by ~2.4s.",
  },
  {
    id: "s2",
    title: "Defensive",
    target: "RUS",
    confidence: 71,
    window: "L44-L45",
    detail: "Mirror ANTs pit lap only if delta below 1.4s and tire temp > 103C.",
  },
  {
    id: "s3",
    title: "Aggressive",
    target: "NOR",
    confidence: 64,
    window: "L39-L40",
    detail: "Early stop unlocks clean air. Pace gain expected +0.18s/lap for 7 laps.",
  },
];

function getActiveRace() {
  const now = Date.now();
  return raceCalendar.find((race) => {
    const start = new Date(race.raceIso).getTime();
    const end = start + 3 * 60 * 60 * 1000;
    return now >= start && now <= end;
  });
}

function formatTimeUntil(targetIso: string) {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return "Now";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return `${days}d ${String(hours).padStart(2, "0")}h`;
}

export default function PitWallPage() {
  const activeRace = getActiveRace();
  const nextRace = useMemo(() => {
    const now = Date.now();
    return raceCalendar.find((race) => new Date(race.raceIso).getTime() > now) ?? raceCalendar[0];
  }, []);

  const [selectedDriver, setSelectedDriver] = useState(positionsSeed[0].code);
  const speed = useStreamingNumber(292, 334, 321);
  const ers = useStreamingNumber(18, 92, 67);
  const throttle = useStreamingNumber(34, 100, 84);
  const brake = useStreamingNumber(2, 56, 19);
  const rpm = useStreamingNumber(10800, 12100, 11680);

  if (!activeRace) {
    return (
      <div className="space-y-4">
        <section className="dashboard-panel relative overflow-hidden border border-outline-variant/30 p-6">
          <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute -bottom-14 -left-14 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-on-surface-variant" />
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                Pit Wall Standby
              </p>
            </div>
            <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface">Race Insights Lockout</h2>
            <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
              The command wall activates only during an ongoing race session. As soon as lights out begins, this screen
              switches to live positions, team radios, strategy windows, pace deltas, and telemetry streams.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="dashboard-panel border border-primary/20 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Next Activation</p>
            <h3 className="mt-2 font-headline text-xl font-semibold">{nextRace.name}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">
              {nextRace.city}, {nextRace.country}
            </p>
            <p className="mt-4 font-mono text-3xl text-on-surface">{formatTimeUntil(nextRace.raceIso)}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Until race start
            </p>
          </article>

          <article className="dashboard-panel border border-secondary/20 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">What Unlocks Live</p>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-secondary" /> Real-time top 10 positions</li>
              <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-secondary" /> Team radio intelligence feed</li>
              <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-secondary" /> Optimal strategy windows</li>
              <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-secondary" /> Pace + tire degradation insights</li>
              <li className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-secondary" /> Driver telemetry channels</li>
            </ul>
          </article>

          <article className="dashboard-panel border border-tertiary/20 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-tertiary">Status</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant">Timing Feed</span>
                <span className="font-mono text-xs text-on-surface">Standby</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant">Radio Decoder</span>
                <span className="font-mono text-xs text-on-surface">Standby</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant">Strategy Engine</span>
                <span className="font-mono text-xs text-on-surface">Standby</span>
              </div>
            </div>
          </article>
        </section>
      </div>
    );
  }

  const selected = positionsSeed.find((d) => d.code === selectedDriver) ?? positionsSeed[0];

  return (
    <div className="space-y-4">
      <section className="dashboard-panel relative overflow-hidden border border-alert-red/25 p-5">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-alert-red/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert-red opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-alert-red" />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-alert-red">Race Live</p>
            </div>
            <h2 className="mt-2 font-headline text-3xl font-bold">{activeRace.name} — Pit Wall</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {activeRace.circuit} · {activeRace.city}
            </p>
          </div>

          <div className="flex gap-2">
            <StatPill icon={Flag} label="Lap" value="38 / 58" accent="text-primary" />
            <StatPill icon={CloudSun} label="Track" value="33C" accent="text-secondary" />
            <StatPill icon={Waves} label="Wind" value="7km/h" accent="text-tertiary" />
            <StatPill icon={Timer} label="SC Risk" value="12%" accent="text-on-surface" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-4">
        <section className="col-span-12 xl:col-span-4">
          <div className="dashboard-panel h-full border border-outline-variant/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Live Positions</p>
              <span className="font-mono text-[10px] text-on-surface-variant">Top 10</span>
            </div>

            <div className="space-y-1.5">
              {positionsSeed.map((row) => {
                const selectedRow = row.code === selectedDriver;
                return (
                  <motion.button
                    key={row.code}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedDriver(row.code)}
                    className={`grid w-full grid-cols-[2.2rem_1fr_4.6rem_4rem] items-center gap-2 border px-2.5 py-2 text-left transition ${
                      selectedRow
                        ? "border-secondary/50 bg-secondary/8 shadow-[0_0_16px_rgba(126,246,238,0.14)]"
                        : "border-outline-variant/20 hover:border-outline-variant/50"
                    }`}
                  >
                    <span className="font-mono text-xs text-on-surface-variant">P{row.pos}</span>
                    <span>
                      <span className="font-headline text-sm">{row.code}</span>
                      <span className="ml-2 font-mono text-[10px] text-on-surface-variant">{row.compound}</span>
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant">{row.gap}</span>
                    <span className="font-mono text-[10px] text-secondary">{row.lastLap}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="col-span-12 space-y-4 xl:col-span-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="dashboard-panel border border-outline-variant/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  <Radio className="h-3.5 w-3.5" /> Team Radios
                </p>
                <span className="font-mono text-[10px] text-on-surface-variant">Decoded live</span>
              </div>

              <div className="space-y-2.5">
                {radios.map((item) => (
                  <div
                    key={item.id}
                    className={`border px-3 py-2 ${
                      item.severity === "alert"
                        ? "border-alert-red/35 bg-alert-red/5"
                        : "border-outline-variant/20 bg-surface-container-low/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        {item.at} · {item.source}
                      </p>
                      <span className="font-mono text-[10px] text-secondary">{item.code}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-on-surface/90">{item.message}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel border border-outline-variant/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-tertiary">
                  <ShieldAlert className="h-3.5 w-3.5" /> Optimal Strategy
                </p>
                <span className="font-mono text-[10px] text-on-surface-variant">Model-assisted</span>
              </div>

              <div className="space-y-2.5">
                {strategyCalls.map((call) => (
                  <div key={call.id} className="border border-outline-variant/20 bg-surface-container-low/40 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-headline text-sm">{call.title} · {call.target}</p>
                      <p className="font-mono text-[10px] text-secondary">{call.window}</p>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant">
                        <span>Confidence</span>
                        <span>{call.confidence}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className="h-full rounded-full bg-tertiary"
                          style={{ width: `${call.confidence}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-on-surface-variant">{call.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="dashboard-panel border border-outline-variant/30 p-4">
              <p className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
                <Activity className="h-3.5 w-3.5" /> Race Pace Insights
              </p>

              <div className="space-y-3">
                {[
                  { team: "Mercedes", delta: -0.18, score: 92 },
                  { team: "Ferrari", delta: -0.12, score: 84 },
                  { team: "McLaren", delta: -0.05, score: 72 },
                  { team: "Red Bull", delta: 0.03, score: 61 },
                ].map((insight) => (
                  <div key={insight.team}>
                    <div className="flex items-center justify-between">
                      <p className="font-headline text-sm">{insight.team}</p>
                      <p className={`font-mono text-[10px] ${insight.delta <= 0 ? "text-secondary" : "text-alert-red"}`}>
                        {insight.delta <= 0 ? "" : "+"}
                        {insight.delta.toFixed(2)}s/lap
                      </p>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-secondary"
                        style={{ width: `${insight.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel border border-outline-variant/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  <Gauge className="h-3.5 w-3.5" /> Driver Telemetry
                </p>
                <span className="font-mono text-[10px] text-on-surface-variant">{selected.code} channel</span>
              </div>

              <div className="mb-3 border border-outline-variant/20 bg-surface-container-low/50 px-3 py-2">
                <p className="font-headline text-sm">{selected.driver}</p>
                <p className="font-mono text-[10px] text-on-surface-variant">{selected.team}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <TelemetryTile label="Speed" value={`${speed} kph`} accent="text-secondary" />
                <TelemetryTile label="ERS" value={`${ers}%`} accent="text-primary" />
                <TelemetryTile label="Throttle" value={`${throttle}%`} accent="text-tertiary" />
                <TelemetryTile label="Brake" value={`${brake}%`} accent="text-alert-red" />
              </div>

              <div className="mt-3 border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Power Unit</p>
                <p className="mt-1 font-mono text-xl text-on-surface">{rpm} rpm</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="border border-outline-variant/25 bg-surface-container-low/40 px-3 py-2">
      <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-on-surface-variant">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className={`mt-1 font-mono text-sm ${accent}`}>{value}</p>
    </div>
  );
}

function TelemetryTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant">{label}</p>
      <p className={`mt-1 font-mono text-lg ${accent}`}>{value}</p>
    </div>
  );
}
