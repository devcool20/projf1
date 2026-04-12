"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { DashboardProfileModal, PremiumProfileTrigger } from "@/components/dashboard/dashboard-profile-modal";
import {
  Radio,
  Calendar,
  Target,
  Heart,
  MessageCircle,
  MapPin,
  Clock,
  Flag,
  Trophy,
  Users,
  ChevronRight,
  Wifi,
  Zap,
} from "lucide-react";
import { TelemetryTicker } from "@/components/shell/telemetry-ticker";
import { MovingBorderButton } from "@/components/ui/moving-border";
import {
  commThreads,
  racePredictions,
  raceCalendar,
} from "@/lib/mock-data";
import { computeSignalScore, getSignalLabel } from "@/lib/signal-score";
import type { CommThread, RacePrediction, RaceWeekend } from "@/lib/types";
import { supabase } from "@/lib/supabase";

type LiveThread = CommThread & { activityScore: number };
type LivePrediction = RacePrediction & {
  activityScore: number;
  eventId: string | null;
  eventName: string;
};

type RawProfile = {
  id: string;
  username: string;
  full_name: string;
};

type RawThread = {
  id: string;
  profile_id: string;
  message: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
};

type RawPrediction = {
  id: string;
  event_id: string | null;
  top3: [string, string, string];
  pole_position: string;
  driver_of_the_day: string;
  likes_count: number;
  created_at: string;
  profiles: RawProfile | RawProfile[] | null;
  prediction_config?: { event_name?: string } | { event_name?: string }[] | null;
};

function pickProfile(profile: RawProfile | RawProfile[] | null | undefined): RawProfile {
  if (!profile) return { id: "", username: "unknown", full_name: "Unknown" };
  if (Array.isArray(profile)) return profile[0] ?? { id: "", username: "unknown", full_name: "Unknown" };
  return profile;
}

function pickConfig(
  config: { event_name?: string } | { event_name?: string }[] | null | undefined,
): { event_name?: string } {
  if (!config) return {};
  if (Array.isArray(config)) return config[0] ?? {};
  return config;
}

function computeThreadActivity(likes: number, comments: number, createdAtIso: string) {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAtIso).getTime()) / 3_600_000);
  const recencyBoost = Math.max(0, 30 - ageHours) * 1.6;
  return likes * 0.9 + comments * 4 + recencyBoost;
}

function computePredictionActivity(likes: number, createdAtIso: string) {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAtIso).getTime()) / 3_600_000);
  const recencyBoost = Math.max(0, 24 - ageHours) * 1.35;
  return likes * 1.5 + recencyBoost;
}

function classifyActivity(score: number) {
  if (score >= 140) return { label: "SURGING", color: "#f97316" };
  if (score >= 95) return { label: "RISING", color: "#fb7185" };
  if (score >= 55) return { label: "LIVE", color: "#7c3aed" };
  return { label: "STEADY", color: "#64748b" };
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

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

const gridStagger = {
  hidden: {},
  show: {},
};

const gridItem = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};

export default function DashboardPage() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [threadFeed, setThreadFeed] = useState<LiveThread[]>([]);
  const [predictionFeed, setPredictionFeed] = useState<LivePrediction[]>([]);
  const [threadIndex, setThreadIndex] = useState(0);
  const [predictionIndex, setPredictionIndex] = useState(0);
  const nextRaceData = getNextRace(raceCalendar);

  const topThread = useMemo(
    () => (threadFeed.length ? threadFeed[threadIndex % threadFeed.length] : null),
    [threadFeed, threadIndex],
  );
  const topPrediction = useMemo(
    () => (predictionFeed.length ? predictionFeed[predictionIndex % predictionFeed.length] : null),
    [predictionFeed, predictionIndex],
  );

  const topThreadSignal = topThread ? classifyActivity(topThread.activityScore) : null;
  const topPredictionSignal = topPrediction ? classifyActivity(topPrediction.activityScore) : null;

  useEffect(() => {
    const loadDashboardFeed = async () => {
      try {
        const [{ data: rawThreads }, { data: rawPredictions }] = await Promise.all([
          supabase
            .from("comms_threads")
            .select("id, profile_id, message, image_url, likes_count, comments_count, created_at, profiles(id, username, full_name)")
            .order("created_at", { ascending: false })
            .limit(80),
          supabase
            .from("race_predictions")
            .select("id, event_id, top3, pole_position, driver_of_the_day, likes_count, created_at, profiles(id, username, full_name), prediction_config(event_name)")
            .order("created_at", { ascending: false })
            .limit(100),
        ]);

        const mappedThreads: LiveThread[] = ((rawThreads ?? []) as RawThread[])
          .map((t) => {
            const p = pickProfile(t.profiles);
            return {
              id: t.id,
              profileId: t.profile_id,
              username: p.username || "@unknown",
              fullName: p.full_name || "Unknown",
              message: t.message,
              imageUrl: t.image_url ?? undefined,
              likes: t.likes_count,
              comments: t.comments_count,
              createdAt: new Date(t.created_at).toLocaleString("en-GB", { hour12: false }),
              replies: [],
              activityScore: computeThreadActivity(t.likes_count, t.comments_count, t.created_at),
            };
          })
          .sort((a, b) => b.activityScore - a.activityScore)
          .slice(0, 5);

        const mappedPredictions: LivePrediction[] = ((rawPredictions ?? []) as RawPrediction[])
          .map((p) => {
            const profile = pickProfile(p.profiles);
            const cfg = pickConfig(p.prediction_config);
            return {
              id: p.id,
              eventId: p.event_id,
              eventName: cfg.event_name || "Grand Prix",
              username: profile.username || "@unknown",
              fullName: profile.full_name || "Unknown",
              createdAt: new Date(p.created_at).toLocaleString("en-GB", { hour12: false }),
              top3: p.top3,
              polePosition: p.pole_position,
              driverOfTheDay: p.driver_of_the_day,
              likes: p.likes_count,
              activityScore: computePredictionActivity(p.likes_count, p.created_at),
            };
          })
          .sort((a, b) => b.activityScore - a.activityScore)
          .slice(0, 5);

        setThreadFeed(mappedThreads.length ? mappedThreads : []);
        setPredictionFeed(mappedPredictions.length ? mappedPredictions : []);
      } catch {
        const fallbackThreads = [...commThreads]
          .map((t) => ({ ...t, activityScore: computeSignalScore(t) }))
          .sort((a, b) => b.activityScore - a.activityScore)
          .slice(0, 5);
        const fallbackPredictions = [...racePredictions]
          .map((p, idx) => ({
            ...p,
            eventId: null,
            eventName: "Grand Prix",
            activityScore: computePredictionActivity(p.likes, new Date(Date.now() - idx * 2_500_000).toISOString()),
          }))
          .sort((a, b) => b.activityScore - a.activityScore)
          .slice(0, 5);
        setThreadFeed(fallbackThreads);
        setPredictionFeed(fallbackPredictions);
      }
    };

    void loadDashboardFeed();
  }, []);

  useEffect(() => {
    if (threadFeed.length <= 1) return;
    const id = setInterval(() => setThreadIndex((v) => (v + 1) % threadFeed.length), 4800);
    return () => clearInterval(id);
  }, [threadFeed.length]);

  useEffect(() => {
    if (predictionFeed.length <= 1) return;
    const id = setInterval(() => setPredictionIndex((v) => (v + 1) % predictionFeed.length), 5200);
    return () => clearInterval(id);
  }, [predictionFeed.length]);

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
        {...fadeIn}
        transition={{ duration: 0.15 }}
        className="surface-ink relative w-full overflow-hidden p-6 sm:p-7"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-white/4 blur-2xl" />
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
          <Link href={topThread ? `/comms?t=${topThread.id}` : "/comms"} className="group block h-full">
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
                {topThreadSignal ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: topThreadSignal.color }} />
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em]" style={{ color: topThreadSignal.color }}>
                      {topThreadSignal.label} · {Math.round(topThread?.activityScore ?? 0)}
                    </span>
                  </div>
                ) : null}
              </div>

              {topThread ? (
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
              ) : (
                <p className="mt-4 text-sm text-slate-500">No live thread feed yet.</p>
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

        {/* 3. Top Prediction — moved from lower row */}
        <motion.div variants={gridItem} className="xl:col-span-1">
          <Link
            href={
              topPrediction?.eventId
                ? `/predictions?event=${topPrediction.eventId}&prediction=${topPrediction.id}`
                : "/predictions"
            }
            className="group block h-full"
          >
            <MovingBorderButton
              as="div"
              borderRadius="1.25rem"
              duration={5000}
              containerClassName="h-full"
              className="dashboard-panel flex h-full flex-col p-5 transition hover:border-secondary/35"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/12">
                    <Target className="h-3.5 w-3.5 text-secondary" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary">
                    Top Prediction
                  </p>
                </div>
                {topPredictionSignal ? (
                  <span
                    className="font-mono text-[9px] font-medium uppercase tracking-[0.12em]"
                    style={{ color: topPredictionSignal.color }}
                  >
                    {topPredictionSignal.label}
                  </span>
                ) : null}
              </div>

              {topPrediction ? (
                <div className="mt-4">
                  <h3 className="line-clamp-1 font-headline text-[15px] font-semibold text-slate-900">{topPrediction.eventName}</h3>
                  <div className="mt-1 flex flex-wrap items-baseline gap-2">
                    <p className="font-headline text-sm font-semibold text-slate-900">{topPrediction.username}</p>
                    <p className="text-[11px] font-medium text-slate-500">{topPrediction.fullName}</p>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-primary" />{topPrediction.top3.join(" · ")}</div>
                    <div className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-secondary" />Pole: {topPrediction.polePosition}</div>
                    <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-tertiary" />DOTD: {topPrediction.driverOfTheDay}</div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No live prediction feed yet.</p>
              )}

              <div className="mt-auto flex items-center gap-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-secondary">
                Open Prediction <ChevronRight className="h-3 w-3" />
              </div>
            </MovingBorderButton>
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
    <div className="relative flex h-full flex-col overflow-hidden rounded-[24px] border border-white/15 bg-linear-to-br from-primary/80 via-primary/55 to-secondary/65 p-5 text-white shadow-[0_22px_45px_rgba(124,58,237,0.35)] transition hover:scale-[1.005]">
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
        <div className="mt-4 rounded-card border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-md">
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
