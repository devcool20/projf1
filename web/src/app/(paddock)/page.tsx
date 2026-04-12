"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardProfileModal, PremiumProfileTrigger } from "@/components/dashboard/dashboard-profile-modal";
import {
  Radio,
  Calendar,
  Clapperboard,
  Target,
  Heart,
  MessageCircle,
  MapPin,
  Clock,
  Flag,
  Trophy,
  Users,
  Ticket,
  ChevronRight,
  Wifi,
  Zap,
} from "lucide-react";
import { TelemetryTicker } from "@/components/shell/telemetry-ticker";
import { MovingBorderButton } from "@/components/ui/moving-border";
import {
  commThreads,
  racePredictions,
  predictionConfig,
  screeningEvents,
  raceCalendar,
} from "@/lib/mock-data";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import type { CommThread, RacePrediction, RaceWeekend, ScreeningEvent } from "@/lib/types";

function getTopThread(threads: CommThread[]) {
  return [...threads].sort((a, b) => computeSignalScore(b) - computeSignalScore(a))[0];
}

function getTopPrediction(predictions: RacePrediction[]) {
  return [...predictions].sort((a, b) => b.likes - a.likes)[0];
}

function getNextRace(calendar: RaceWeekend[]): { race: RaceWeekend; isRaceWeekend: boolean } | null {
  const now = Date.now();
  for (const race of calendar) {
    const raceEnd = new Date(race.raceIso).getTime() + 3 * 3600_000;
    if (raceEnd > now) {
      const fp1 = new Date(race.fp1Iso).getTime();
      const isRaceWeekend = now >= fp1 && now <= raceEnd;
      return { race, isRaceWeekend };
    }
  }
  return calendar.length > 0
    ? { race: calendar[calendar.length - 1], isRaceWeekend: false }
    : null;
}

function getUpcomingScreening(events: ScreeningEvent[]) {
  return events[0] ?? null;
}

function useCountdown(targetIso: string) {
  const [ms, setMs] = useState(() => new Date(targetIso).getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(new Date(targetIso).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  if (ms <= 0) return "LIVE NOW";

  const days = Math.floor(ms / 86_400_000);
  const hrs = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);

  if (days > 0) return `${days}d ${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m`;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const gridStagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const gridItem = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36 } },
};

export default function DashboardPage() {
  const [profileOpen, setProfileOpen] = useState(false);
  const topThread = getTopThread(commThreads);
  const topPrediction = getTopPrediction(racePredictions);
  const nextRaceData = getNextRace(raceCalendar);
  const screening = getUpcomingScreening(screeningEvents);

  const topThreadScore = topThread ? computeSignalScore(topThread) : 0;
  const topThreadSignal = getSignalLabel(topThreadScore);

  return (
    <motion.div initial={false} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex max-w-full items-center gap-2">
        <div className="min-w-0 flex-1">
          <TelemetryTicker />
        </div>
        <PremiumProfileTrigger onPress={() => setProfileOpen(true)} />
      </div>
      <DashboardProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {/* Hero — premium ink (no moving border; border lives on bento cards below) */}
      <motion.section
        {...fadeUp}
        transition={{ duration: 0.4 }}
        className="surface-ink relative w-full overflow-hidden p-6 sm:p-7"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5 text-zinc-500" />
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
              Mission Control Active
            </p>
          </div>
          <h2 className="mt-2 font-headline text-3xl font-semibold tracking-tight text-white sm:text-4xl">projf1</h2>
          <p className="surface-ink-muted mt-2 max-w-2xl text-sm leading-relaxed">
            Your race weekend command center — threads, predictions, screenings, and the full grid at a glance.
          </p>
        </div>
      </motion.section>

      {/* Bento Grid */}
      <motion.div
        variants={gridStagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {/* 1. Top Thread of the Hour — moving border */}
        <motion.div variants={gridItem} className="xl:col-span-1">
          <Link href="/comms" className="group block h-full">
            <MovingBorderButton
              as="div"
              borderRadius="1.25rem"
              duration={4600}
              containerClassName="h-full"
              className="dashboard-panel flex h-full flex-col p-5 transition hover:border-primary/35"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12">
                    <Radio className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    Top Thread
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: topThreadSignal.color }} />
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: topThreadSignal.color }}>
                    {topThreadSignal.label} · {topThreadScore}
                  </span>
                </div>
              </div>

              {topThread && (
                <div className="mt-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="font-headline text-sm font-semibold text-slate-900">{topThread.username}</p>
                    <p className="text-[11px] font-medium text-slate-500">{topThread.fullName}</p>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm font-normal leading-relaxed text-slate-600">
                    {topThread.message}
                  </p>
                  <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{topThread.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{topThread.comments}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{topThread.createdAt}</span>
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Open Comms <ChevronRight className="h-3 w-3" />
              </div>
            </MovingBorderButton>
          </Link>
        </motion.div>

        {/* 2. Next Race / Race Weekend */}
        <motion.div variants={gridItem} className="xl:col-span-2">
          <NextRaceCard data={nextRaceData} />
        </motion.div>

        {/* 3. Upcoming Screening — moving border */}
        <motion.div variants={gridItem} className="xl:col-span-1">
          <Link href="/paddock-premieres" className="group block h-full">
            <MovingBorderButton
              as="div"
              borderRadius="1.25rem"
              duration={5000}
              containerClassName="h-full"
              className="dashboard-panel flex h-full flex-col p-5 transition hover:border-tertiary/35"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-tertiary/12">
                  <Clapperboard className="h-3.5 w-3.5 text-tertiary" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-tertiary">
                  Next Screening
                </p>
              </div>

              {screening && (
                <div className="mt-4">
                  <h3 className="font-headline text-lg font-semibold text-slate-900">{screening.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{screening.city}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{screening.dateLabel}</span>
                    <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />₹{screening.entryFee}</span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
                      <span>{screening.bookedSeats} booked</span>
                      <span>{screening.totalSeats - screening.bookedSeats} left</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-tertiary transition-all"
                        style={{ width: `${(screening.bookedSeats / screening.totalSeats) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-tertiary">
                View Screenings <ChevronRight className="h-3 w-3" />
              </div>
            </MovingBorderButton>
          </Link>
        </motion.div>

        {/* 4. Top Prediction of the Hour */}
        <motion.div variants={gridItem} className="xl:col-span-2">
          <Link href="/predictions" className="group block h-full">
            <div className="dashboard-panel flex h-full flex-col p-5 transition hover:border-secondary/40 hover:scale-[1.005]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded bg-secondary/15">
                    <Target className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Top Prediction
                  </p>
                </div>
                <span className="text-[10px] font-medium text-slate-500">{predictionConfig.eventName}</span>
              </div>

              {topPrediction && (
                <div className="mt-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="font-headline text-sm font-semibold text-slate-900">{topPrediction.username}</p>
                    <p className="text-[11px] font-medium text-slate-500">{topPrediction.fullName}</p>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Podium</span>
                      <span className="font-mono text-xs font-medium">
                        {topPrediction.top3.map((d, i) => (
                          <span key={d}>
                            {i > 0 && <span className="text-outline-variant"> · </span>}
                            <span className={i === 0 ? "text-primary font-semibold" : "text-slate-700"}>{d.split(" ").pop()}</span>
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-secondary" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Pole</span>
                      <span className="font-mono text-xs font-medium text-slate-800">{topPrediction.polePosition}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-tertiary" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">DOTD</span>
                      <span className="font-mono text-xs font-medium text-slate-800">{topPrediction.driverOfTheDay}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Heart className="h-3 w-3" /> {topPrediction.likes} likes
                    <span className="text-outline-variant">·</span>
                    {topPrediction.createdAt}
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
                All Predictions <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function NextRaceCard({ data }: { data: { race: RaceWeekend; isRaceWeekend: boolean } | null }) {
  const fallbackIso = "2099-01-01T00:00:00.000Z";
  const countdown = useCountdown(data?.race.raceIso ?? fallbackIso);
  if (!data) return null;
  const { race, isRaceWeekend } = data;
  const isLive = countdown === "LIVE NOW";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/15 bg-gradient-to-br from-primary/80 via-primary/55 to-secondary/65 p-5 text-white shadow-[0_22px_45px_rgba(124,58,237,0.35)] transition hover:scale-[1.005]">
      <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded ${isRaceWeekend ? "bg-alert-red/20" : "bg-primary/15"}`}>
            <Flag className={`h-3.5 w-3.5 ${isRaceWeekend ? "text-alert-red" : "text-primary"}`} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
            {isRaceWeekend ? "Race Weekend Live" : "Next Race"}
          </p>
        </div>
        {isRaceWeekend && (
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-alert-red opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-alert-red" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-alert-red">Live</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">{race.flagEmoji}</span>
          <h3 className="font-headline text-lg font-semibold text-white">{race.name}</h3>
        </div>
        <p className="mt-1 text-[11px] font-medium text-white/65">{race.circuit}</p>
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-white/70">
          <MapPin className="h-3 w-3" />{race.city}, {race.country}
          <span className="text-outline-variant">·</span>
          Round {race.round}/{race.totalRounds}
        </div>

        {/* Countdown */}
        <div className="mt-4 rounded-[20px] border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65">
            {isLive ? "Race Status" : "Lights Out In"}
          </p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-white">
            {countdown}
          </p>
        </div>

        {/* Session tiles */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <SessionTile label="FP1" iso={race.fp1Iso} />
          <SessionTile label="QUALI" iso={race.qualifyingIso} />
          <SessionTile label="RACE" iso={race.raceIso} />
        </div>
      </div>
    </div>
  );
}

function SessionTile({ label, iso }: { label: string; iso: string }) {
  const date = new Date(iso);
  const isPast = false;

  return (
    <div className={`rounded border px-2 py-1.5 text-center ${isPast ? "border-secondary/30 bg-secondary/5" : "border-outline-variant/20"}`}>
      <p className={`font-mono text-[9px] uppercase tracking-wider ${isPast ? "text-secondary" : "text-on-surface-variant"}`}>
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-on-surface-variant">
        {date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
      </p>
    </div>
  );
}
