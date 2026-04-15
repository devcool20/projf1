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
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { fastFade, listContainerVariants, listItemVariants, skeletonPulse } from "@/components/motion/premium-motion";

function portalSubscribe() {
  return () => {};
}

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
  const REQUEST_TIMEOUT_MS = 12000;
  const portalMounted = useSyncExternalStore(portalSubscribe, () => true, () => false);
  const [configs, setConfigs] = useState<PredictionConfigRow[]>([]);
  const [predictions, setPredictions] = useState<RacePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedGp | null>(null);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [highlightPredictionId, setHighlightPredictionId] = useState<string>("");
  const [preselectedEventId, setPreselectedEventId] = useState<string>("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const selectedEventIdRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  selectedEventIdRef.current = selected?.config?.id ?? null;

  const withTimeout = useCallback(
    async <T,>(promise: PromiseLike<T>, label: string): Promise<T> => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), REQUEST_TIMEOUT_MS);
      });
      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    },
    [REQUEST_TIMEOUT_MS],
  );

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
    const result = await withTimeout(
      supabase.from("prediction_config").select("id, event_name, qualifying_at, lat, is_active"),
      "Prediction config fetch",
    );
    const { data, error } = result as { data: PredictionConfigRow[] | null; error: { message?: string } | null };
    if (error) {
      throw error;
    }
    setConfigs((data ?? []) as PredictionConfigRow[]);
  }, [withTimeout]);

  const fetchPredictionsForEvent = useCallback(async (eventId: string) => {
    try {
      const result = await withTimeout(
        supabase
          .from("race_predictions")
          .select(`id, top3, pole_position, driver_of_the_day, likes_count, created_at, profiles (username, full_name)`)
          .eq("event_id", eventId)
          .order("likes_count", { ascending: false }),
        "Prediction list fetch",
      );
      const { data, error } = result as { data: RawPredictionRow[] | null; error: { message?: string } | null };
      if (error) throw error;
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
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setPredictions([]);
      setLoadError("Predictions took too long to load. Tap refresh.");
    }
  }, [withTimeout]);

  const refreshAll = useCallback(async () => {
    if (refreshInFlightRef.current) {
      await refreshInFlightRef.current;
      return;
    }
    const task = (async () => {
      setLoadError(null);
      setLoading(true);
      try {
        await fetchConfigs();
      } catch (error) {
        console.error(error);
        setLoadError("Prediction calendar took too long to load. Try refreshing.");
        setConfigs([]);
      } finally {
        setLoading(false);
      }
    })();
    refreshInFlightRef.current = task;
    try {
      await task;
    } finally {
      refreshInFlightRef.current = null;
    }
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
    const params = new URLSearchParams(window.location.search);
    const eventQuery = params.get("event") || "";
    const predictionQuery = params.get("prediction") || "";
    if (eventQuery) setPreselectedEventId(eventQuery);
    if (predictionQuery) setHighlightPredictionId(predictionQuery);
  }, []);

  useEffect(() => {
    if (!preselectedEventId || selected) return;
    const hit = enriched.find((entry) => entry.config?.id === preselectedEventId);
    if (hit) setSelected(hit);
  }, [enriched, preselectedEventId, selected]);

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

  return (
    <AnimatePresence mode="popLayout">
      {loading ? (
        <motion.div
          key="predictions-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fastFade}
          className="grid gap-4"
        >
          <motion.div variants={skeletonPulse} initial="initial" animate="animate" className="skeleton-shimmer h-24 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                variants={skeletonPulse}
                initial="initial"
                animate="animate"
                className="skeleton-shimmer h-40 rounded-2xl"
              />
            ))}
          </div>
        </motion.div>
      ) : (
    <motion.div
      key="predictions-loaded"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fastFade}
      className="relative pb-24"
    >
      <header className="surface-ink relative mb-6 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Predictions</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="relative min-w-0">
            <h1 className="font-headline text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Grand Prix picks
            </h1>
            <p className="surface-ink-muted mt-2 max-w-2xl text-sm font-normal leading-relaxed">
              Rounds in the next 30 days on the calendar. Open a race for community picks — deploy from{" "}
              <span className="font-medium text-zinc-300">+</span>. Locks one hour before qualifying.
            </p>
          </div>
          {selected && (
            <div className="card-surface shrink-0 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Qualifying countdown</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-white sm:text-2xl">{countdown}</p>
              <p className="mt-1 text-xs font-medium text-zinc-500">{postLocked ? "Locked" : "Open for picks"}</p>
            </div>
          )}
        </div>
      </header>
      {loadError && (
        <div className="dashboard-panel mb-5 flex items-center justify-between gap-3 p-4 text-sm">
          <p className="text-on-surface-variant">{loadError}</p>
          <button type="button" onClick={() => void refreshAll()} className="btn-premium btn-outline-glass rounded-full px-3 py-1.5 text-xs">
            Refresh
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
      {!selected ? (
        <motion.section
          key="predictions-gp-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fastFade}
        >
          <h2 className="mb-4 font-headline text-[15px] font-semibold tracking-tight text-on-surface">Upcoming Grands Prix</h2>
          {enriched.length === 0 ? (
            <div className="dashboard-panel p-8 text-center text-sm text-on-surface-variant">
              No races in the 30-day prediction window right now. Check back closer to the next Grand Prix.
            </div>
          ) : (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              variants={listContainerVariants}
              initial="hidden"
              animate="show"
            >
              {enriched.map(({ round, config }) => (
                  <motion.button
                    key={round.slug}
                    type="button"
                    className="dashboard-panel group relative flex h-full w-full flex-col overflow-hidden px-5 pb-4 pt-4 text-left transition hover:border-primary/25"
                    onClick={() => setSelected({ round, config })}
                    variants={listItemVariants}
                    transition={fastFade}
                  >
                    <p className="pr-6 font-headline text-[15px] font-semibold leading-snug tracking-tight text-on-surface">
                      {round.name}
                    </p>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-on-surface-variant">{round.circuit}</p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200/70 pt-3">
                      <span className="gp-meta-row inline-flex items-center gap-1.5 text-on-surface-variant">
                        <MapPin className="h-3 w-3 text-on-surface-variant/70" strokeWidth={2} aria-hidden />
                        {round.country}
                      </span>
                      <span className="gp-meta-row inline-flex items-center gap-1.5 text-on-surface-variant">
                        <Calendar className="h-3 w-3 text-on-surface-variant/70" strokeWidth={2} aria-hidden />
                        {formatGpRange(round)}
                      </span>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <ChevronRight
                        className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden
                      />
                    </div>
                  </motion.button>
              ))}
            </motion.div>
          )}
        </motion.section>
      ) : (
        <motion.section
          key={`predictions-gp-${selected.round.slug}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fastFade}
        >
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="btn-premium btn-outline-glass mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            All Grands Prix
          </button>

          <div className="dashboard-panel mb-6 p-5 sm:p-6">
            <div className="flex flex-wrap items-start gap-4">
              <span className="text-4xl">{selected.round.flagEmoji}</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-headline text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">{selected.round.name}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">{selected.round.circuit}</p>
                <p className="mt-2 text-xs text-on-surface-variant">{formatGpRange(selected.round)}</p>
              </div>
              <div className="card-surface rounded-2xl px-4 py-3 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Grid predictions</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-on-surface">{predictions.length}</p>
              </div>
            </div>
          </div>

          <h3 className="mb-3 font-headline text-[15px] font-semibold text-on-surface">Community picks</h3>
          {!selected.config ? (
            <div className="dashboard-panel p-6 text-sm text-on-surface-variant">
              This round is not linked to <code className="font-mono text-xs">prediction_config</code> yet, so
              community submissions cannot load. After your admin adds a row whose{" "}
              <code className="font-mono text-xs">event_name</code> matches this Grand Prix, predictions appear here.
            </div>
          ) : predictions.length === 0 ? (
            <div className="dashboard-panel p-8 text-center text-sm text-on-surface-variant">
              No predictions yet for this Grand Prix. Be the first — tap + to deploy yours.
            </div>
          ) : (
            <motion.div
              className="space-y-4"
              variants={listContainerVariants}
              initial="hidden"
              animate="show"
            >
              {predictions.map((prediction) => (
                <motion.article
                  key={prediction.id}
                  variants={listItemVariants}
                  transition={fastFade}
                  className={`dashboard-panel p-5 transition ${
                    highlightPredictionId === prediction.id ? "ring-2 ring-primary/35 shadow-[0_0_0_1px_rgba(124,58,237,0.2)]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-headline text-[15px] font-semibold tracking-tight text-on-surface">{prediction.fullName}</p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {prediction.username} · {prediction.createdAt}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => likePrediction(prediction.id)}
                      className="btn-premium btn-outline-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-on-surface-variant"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      {prediction.likes}
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">Podium</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {prediction.top3.map((driver, index) => (
                      <div key={`${prediction.id}-${driver}`} className="card-surface rounded-xl p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">P{index + 1}</p>
                        <p className="mt-1 font-headline text-sm font-semibold text-on-surface">{driver}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="card-surface rounded-xl p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Pole</p>
                      <p className="mt-1 text-sm font-medium text-on-surface">{prediction.polePosition}</p>
                    </div>
                    <div className="card-surface rounded-xl p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Driver of the day</p>
                      <p className="mt-1 text-sm font-medium text-on-surface">{prediction.driverOfTheDay}</p>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}
        </motion.section>
      )}
      </AnimatePresence>

      {enriched.length > 0 &&
        portalMounted &&
        createPortal(
          <button
            type="button"
            aria-label="New prediction"
            onClick={() => setCreatorOpen(true)}
            className="fab-premium bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-200 h-11 w-11 text-lg transition hover:scale-105 active:scale-95 sm:right-6"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
          </button>,
          document.body,
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
    </motion.div>
      )}
    </AnimatePresence>
  );
}
