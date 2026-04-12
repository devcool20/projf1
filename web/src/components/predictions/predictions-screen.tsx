"use client";

import { RacePrediction } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import {
  F1_2026_CALENDAR,
  type F1Round2026,
  type PredictionConfigRow,
  formatGpRange,
  getQualifyingLockTimeMs,
  isRoundInPredictionHorizon,
  matchConfigToRound,
} from "@/lib/f1-calendar-2026";
import { PredictionCreatorModal } from "@/components/predictions/prediction-creator-modal";
import { ArrowLeft, Calendar, ChevronRight, Heart, MapPin, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RawPredictionRow = {
  id: string;
  top3: [string, string, string];
  pole_position: string;
  driver_of_the_day: string;
  likes_count: number;
  created_at: string;
  profiles:
    | { username: string; full_name: string }
    | { username: string; full_name: string }[];
};

function pickProfile(
  profile:
    | { username: string; full_name: string }
    | { username: string; full_name: string }[]
    | null
    | undefined,
) {
  if (!profile) return { username: "unknown", full_name: "Unknown" };
  if (Array.isArray(profile)) return profile[0] ?? { username: "unknown", full_name: "Unknown" };
  return profile;
}

function formatCountdown(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type SelectedGp = {
  round: F1Round2026;
  config: PredictionConfigRow | null;
};

export function PredictionsScreen() {
  const [configs, setConfigs] = useState<PredictionConfigRow[]>([]);
  const [predictions, setPredictions] = useState<RacePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectedGp | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const selectedEventIdRef = useRef<string | null>(null);
  selectedEventIdRef.current = selected?.config?.id ?? null;

  const horizonRounds = useMemo(
    () => F1_2026_CALENDAR.filter((r) => isRoundInPredictionHorizon(r, new Date(nowTick), 30)),
    [nowTick],
  );

  const enriched = useMemo(
    () =>
      horizonRounds.map((round) => ({
        round,
        config: matchConfigToRound(configs, round),
      })),
    [horizonRounds, configs],
  );

  const fetchConfigs = useCallback(async () => {
    const { data, error } = await supabase.from("prediction_config").select("id, event_name, qualifying_at, lat, is_active");
    if (error) {
      console.error(error);
      setConfigs([]);
      return;
    }
    setConfigs((data ?? []) as PredictionConfigRow[]);
  }, []);

  const fetchPredictionsForEvent = useCallback(async (eventId: string) => {
    const { data, error } = await supabase
      .from("race_predictions")
      .select(`id, top3, pole_position, driver_of_the_day, likes_count, created_at, profiles (username, full_name)`)
      .eq("event_id", eventId)
      .order("likes_count", { ascending: false });
    if (error) {
      console.error(error);
      setPredictions([]);
      return;
    }
    const formatted: RacePrediction[] = ((data ?? []) as RawPredictionRow[]).map((p) => {
      const profile = pickProfile(p.profiles);
      return {
        id: p.id,
        username: profile.username,
        fullName: profile.full_name,
        createdAt: new Date(p.created_at).toLocaleDateString("en-GB"),
        top3: p.top3,
        polePosition: p.pole_position,
        driverOfTheDay: p.driver_of_the_day,
        likes: p.likes_count,
      };
    });
    setPredictions(formatted);
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await fetchConfigs();
    setLoading(false);
  }, [fetchConfigs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selected?.config?.id) {
      void fetchPredictionsForEvent(selected.config.id);
    } else {
      setPredictions([]);
    }
  }, [selected, fetchPredictionsForEvent]);

  useEffect(() => {
    const channel = supabase
      .channel("paddock-predictions-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "race_predictions" }, () => {
        const id = selectedEventIdRef.current;
        if (id) void fetchPredictionsForEvent(id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPredictionsForEvent]);

  const likePrediction = async (id: string) => {
    setPredictions((prev) => prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)));
    await supabase.rpc("increment_prediction_likes", { target_id: id });
  };

  const qualifyingMs = selected ? getQualifyingLockTimeMs(selected.round, selected.config) : 0;
  const msUntilQualifying = qualifyingMs - Date.now();
  const postLocked = selected ? msUntilQualifying <= 60 * 60 * 1000 : false;
  const countdown = formatCountdown(msUntilQualifying);

  const modalTarget = useMemo(() => {
    if (selected) {
      return {
        eventId: selected.config?.id ?? null,
        eventTitle: selected.round.name,
        qualifyingAtMs: getQualifyingLockTimeMs(selected.round, selected.config),
      };
    }
    const withCfg = enriched.find((e) => e.config);
    if (withCfg) {
      return {
        eventId: withCfg.config!.id,
        eventTitle: withCfg.round.name,
        qualifyingAtMs: getQualifyingLockTimeMs(withCfg.round, withCfg.config),
      };
    }
    const first = enriched[0];
    if (first) {
      return {
        eventId: first.config?.id ?? null,
        eventTitle: first.round.name,
        qualifyingAtMs: getQualifyingLockTimeMs(first.round, first.config),
      };
    }
    return { eventId: null as string | null, eventTitle: "Grand Prix", qualifyingAtMs: Date.now() + 86400000 };
  }, [selected, enriched]);

  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="skeleton-shimmer h-24 rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="skeleton-shimmer h-40 rounded-2xl" />
          <div className="skeleton-shimmer h-40 rounded-2xl" />
          <div className="skeleton-shimmer h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-24">
      <header className="dashboard-panel mb-6 p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Predictions</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Grand Prix picks
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Open rounds are on the calendar within the next 30 days. Choose a race to see the grid&apos;s predictions,
              then deploy yours from the{" "}
              <span className="font-medium text-slate-800">+</span> button — locked one hour before qualifying.
            </p>
          </div>
          {selected && (
            <div className="dashboard-panel shrink-0 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Qualifying countdown</p>
              <p className="mt-1 font-mono text-2xl tabular-nums text-slate-900">{countdown}</p>
              <p className="mt-1 text-xs text-slate-500">{postLocked ? "Locked" : "Open for picks"}</p>
            </div>
          )}
        </div>
      </header>

      {!selected ? (
        <section>
          <h2 className="mb-4 font-headline text-lg font-semibold text-slate-900">Upcoming Grands Prix</h2>
          {enriched.length === 0 ? (
            <div className="dashboard-panel p-8 text-center text-sm text-slate-600">
              No races in the 30-day prediction window right now. Check back closer to the next Grand Prix.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {enriched.map(({ round, config }) => {
                const qMs = getQualifyingLockTimeMs(round, config);
                const locked = qMs - Date.now() <= 60 * 60 * 1000;
                return (
                  <motion.button
                    key={round.slug}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelected({ round, config })}
                    className="dashboard-panel group w-full overflow-hidden p-5 text-left transition hover:border-primary/25"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-2xl" aria-hidden>
                        {round.flagEmoji}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          locked ? "bg-slate-200 text-slate-600" : "bg-primary/15 text-primary"
                        }`}
                      >
                        {locked ? "Locked" : "Open"}
                      </span>
                    </div>
                    <p className="mt-3 font-headline text-lg font-bold tracking-tight text-slate-900">{round.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{round.circuit}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {round.country}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatGpRange(round)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3">
                      <span className="text-xs text-slate-500">
                        {config ? (
                          <span className="text-emerald-700">Linked · predictions live</span>
                        ) : (
                          <span className="text-amber-700">No DB link · view only</span>
                        )}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            All Grands Prix
          </button>

          <div className="dashboard-panel mb-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-start gap-4">
              <span className="text-4xl">{selected.round.flagEmoji}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-headline text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{selected.round.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{selected.round.circuit}</p>
                <p className="mt-2 text-xs text-slate-500">{formatGpRange(selected.round)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-3 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Grid predictions</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">{predictions.length}</p>
              </div>
            </div>
          </div>

          <h3 className="mb-3 font-headline text-base font-semibold text-slate-900">Community picks</h3>
          {!selected.config ? (
            <div className="dashboard-panel p-6 text-sm text-slate-600">
              This round is not linked to <code className="font-mono text-xs">prediction_config</code> yet, so
              community submissions cannot load. After your admin adds a row whose{" "}
              <code className="font-mono text-xs">event_name</code> matches this Grand Prix, predictions appear here.
            </div>
          ) : predictions.length === 0 ? (
            <div className="dashboard-panel p-8 text-center text-sm text-slate-600">
              No predictions yet for this Grand Prix. Be the first — tap + to deploy yours.
            </div>
          ) : (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <article key={prediction.id} className="dashboard-panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-headline text-base font-semibold tracking-tight text-slate-900">{prediction.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {prediction.username} · {prediction.createdAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => likePrediction(prediction.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary/30 hover:text-primary"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      {prediction.likes}
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">Podium</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {prediction.top3.map((driver, index) => (
                      <div key={`${prediction.id}-${driver}`} className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">P{index + 1}</p>
                        <p className="mt-1 font-headline text-sm font-semibold text-slate-900">{driver}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pole</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{prediction.polePosition}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Driver of the day</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{prediction.driverOfTheDay}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {enriched.length > 0 && (
        <motion.button
          type="button"
          aria-label="New prediction"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCreatorOpen(true)}
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-[95] flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary text-white shadow-[0_12px_28px_rgba(124,58,237,0.35)] sm:right-6"
        >
          <Plus className="h-7 w-7" strokeWidth={2.2} />
        </motion.button>
      )}

      <PredictionCreatorModal
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        eventId={modalTarget.eventId}
        eventTitle={modalTarget.eventTitle}
        qualifyingAtMs={modalTarget.qualifyingAtMs}
        onSubmitted={() => {
          if (selected?.config?.id) void fetchPredictionsForEvent(selected.config.id);
          void fetchConfigs();
        }}
      />
    </div>
  );
}
