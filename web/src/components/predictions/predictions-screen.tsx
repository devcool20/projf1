"use client";

import { predictionDriverPool } from "@/lib/mock-data";
import { RacePrediction } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Clock3, Heart, MessageSquarePlus, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState, useCallback, useRef } from "react";

type PredictionForm = {
  first: string;
  second: string;
  third: string;
  pole: string;
  dotd: string;
};

type PredictionConfig = {
  id: string;
  event_name: string;
  qualifying_at: string;
  lat: string;
};

type RawPredictionRow = {
  id: string;
  top3: [string, string, string];
  pole_position: string;
  driver_of_the_day: string;
  likes_count: number;
  created_at: string;
  profiles:
    | {
        username: string;
        full_name: string;
      }
    | {
        username: string;
        full_name: string;
      }[];
};

function pickProfile(
  profile:
    | {
        username: string;
        full_name: string;
      }
    | {
        username: string;
        full_name: string;
      }[]
    | null
    | undefined,
) {
  if (!profile) {
    return { username: "unknown", full_name: "Unknown Driver" };
  }
  if (Array.isArray(profile)) {
    return profile[0] ?? { username: "unknown", full_name: "Unknown Driver" };
  }
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

function relativeNowLabel() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

export function PredictionsScreen() {
  const [predictions, setPredictions] = useState<RacePrediction[]>([]);
  const [activeConfig, setActiveConfig] = useState<PredictionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [msUntilQualifying, setMsUntilQualifying] = useState(0);
  const [form, setForm] = useState<PredictionForm>({
    first: predictionDriverPool[0],
    second: predictionDriverPool[1],
    third: predictionDriverPool[2],
    pole: predictionDriverPool[0],
    dotd: predictionDriverPool[3],
  });
  const [submitError, setSubmitError] = useState("");
  const [draggingDriver, setDraggingDriver] = useState<string | null>(null);
  const zoneRefs = {
    first: useRef<HTMLDivElement | null>(null),
    second: useRef<HTMLDivElement | null>(null),
    third: useRef<HTMLDivElement | null>(null),
  };

  // --- FETCHING ---

  const fetchPredictionsData = useCallback(async () => {
    try {
      // 1. Get active config
      const { data: configData, error: configError } = await supabase
        .from('prediction_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (configError) throw configError;
      setActiveConfig(configData);

      // 2. Fetch predictions for this event
      const { data, error } = await supabase
        .from('race_predictions')
        .select(`
          id, top3, pole_position, driver_of_the_day, likes_count, created_at,
          profiles (username, full_name)
        `)
        .eq('event_id', configData.id)
        .order('likes_count', { ascending: false });

      if (error) throw error;

      const formatted: RacePrediction[] = ((data ?? []) as RawPredictionRow[]).map((p) => {
        const profile = pickProfile(p.profiles);
        return {
          id: p.id,
          username: profile.username,
          fullName: profile.full_name,
          createdAt: new Date(p.created_at).toLocaleDateString("en-GB"),
          top3: p.top3 as [string, string, string],
          polePosition: p.pole_position,
          driverOfTheDay: p.driver_of_the_day,
          likes: p.likes_count,
        };
      });

      setPredictions(formatted);
    } catch (err) {
      console.error("Error syncing strategy data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictionsData();

    // 📡 Real-time Subscription
    const channel = supabase
      .channel('paddock-predictions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'race_predictions' }, 
        () => fetchPredictionsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPredictionsData]);

  // Handle countdown
  useEffect(() => {
    if (!activeConfig) return;

    const timer = setInterval(() => {
      const qualifyingMs = new Date(activeConfig.qualifying_at).getTime();
      setMsUntilQualifying(qualifyingMs - Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [activeConfig]);

  const postLocked = msUntilQualifying <= 60 * 60 * 1000;
  const lockText = postLocked ? "LOCKED" : "ACTIVE";
  const countdown = formatCountdown(msUntilQualifying);

  const updateField = (field: keyof PredictionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const assignPodiumFromDrop = (driver: string, x: number, y: number) => {
    const zones: Array<keyof Pick<PredictionForm, "first" | "second" | "third">> = ["first", "second", "third"];
    let selected: (typeof zones)[number] = "first";
    let minDist = Number.POSITIVE_INFINITY;

    for (const zone of zones) {
      const rect = zoneRefs[zone].current?.getBoundingClientRect();
      if (!rect) continue;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(cx - x, cy - y);
      if (dist < minDist) {
        minDist = dist;
        selected = zone;
      }
    }

    updateField(selected, driver);
  };

  const likePrediction = async (id: string) => {
    setPredictions(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    await supabase.rpc('increment_prediction_likes', { target_id: id });
  };

  const submitPrediction = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");

    if (postLocked) {
      setSubmitError("Uplink failed: window locked 1h before qualifying.");
      return;
    }

    const podium = [form.first, form.second, form.third];
    const distinct = new Set(podium);
    if (distinct.size !== 3) {
      setSubmitError("Podium error: Drivers must be distinct.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      alert("Encryption Error: Please link your Super License first.");
      return;
    }

    const { error } = await supabase
      .from('race_predictions')
      .insert({
        profile_id: userData.user.id,
        event_id: activeConfig?.id,
        top3: podium,
        pole_position: form.pole,
        driver_of_the_day: form.dotd
      });

    if (error) {
       console.error("Insertion error:", error);
       setSubmitError("Strategy deployment failed. You might have already submitted.");
    } else {
       fetchPredictionsData();
    }
  };

  if (loading || !activeConfig) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton-shimmer h-56 rounded-[24px] md:col-span-2" />
        <div className="skeleton-shimmer h-40 rounded-[24px]" />
        <div className="skeleton-shimmer h-40 rounded-[24px]" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <section className="col-span-12 xl:col-span-8">
        <div className="dashboard-panel mb-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-on-surface-variant">
                Prediction Engine
              </p>
              <h2 className="mt-2 font-headline text-4xl font-bold tracking-tight">
                Strategy Room: <span className="text-primary">Predictions</span>
              </h2>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                Global Simulation Consensus: {activeConfig.event_name}
              </p>
            </div>
            <div className="dashboard-panel min-w-40 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                Locks in
              </p>
              <p className="mt-1 font-mono text-3xl text-on-surface">{countdown}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {predictions.map((prediction) => (
            <article key={prediction.id} className="dashboard-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-surface-container-high border border-outline-variant/10" />
                  <div>
                    <p className="font-headline text-base">{prediction.fullName}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                      {prediction.username} {"//"} {prediction.createdAt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => likePrediction(prediction.id)}
                  className="flex items-center gap-1 border border-outline-variant/30 px-2 py-1 text-xs text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Heart className="h-3.5 w-3.5" />
                  {prediction.likes}
                </button>
              </div>

              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">
                  Projected Podium
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {prediction.top3.map((driver, index) => (
                    <div key={driver} className="border border-outline-variant/30 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">P{index + 1}</p>
                      <p className="mt-2 font-headline text-sm">{driver}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <div className="border border-outline-variant/30 bg-surface-container-low p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                    Pole Position
                  </p>
                  <p className="mt-1 font-headline text-sm">{prediction.polePosition}</p>
                </div>
                <div className="border border-outline-variant/30 bg-surface-container-low p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                    Driver of the Day
                  </p>
                  <p className="mt-1 font-headline text-sm">{prediction.driverOfTheDay}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="col-span-12 xl:col-span-4">
        <div className="dashboard-panel sticky top-0 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
            Prediction Creator
          </p>
          <div className="mt-3 flex items-center justify-between border border-outline-variant/25 bg-surface-container-low px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Uplink {lockText}
            </span>
            <span className="font-mono text-sm text-on-surface">{countdown}</span>
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            Lat: {activeConfig.lat}
          </p>

          <form onSubmit={submitPrediction} className="mt-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Podium Drag Zone</p>

            <div className={`grid grid-cols-3 gap-2 ${postLocked ? "opacity-70 saturate-50" : ""}`}>
              {([
                { key: "second", label: "P2", accent: "text-tertiary", ring: "border-tertiary/35", value: form.second },
                { key: "first", label: "P1", accent: "text-primary", ring: "border-primary/45", value: form.first },
                { key: "third", label: "P3", accent: "text-secondary", ring: "border-secondary/35", value: form.third },
              ] as const).map((slot) => (
                <div
                  key={slot.key}
                  ref={zoneRefs[slot.key]}
                  className={`rounded-[18px] border ${slot.ring} bg-surface-container-low p-3 text-center`}
                >
                  <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${slot.accent}`}>{slot.label}</p>
                  <p className="mt-2 font-headline text-xs">{slot.value.split(" ").pop()}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[18px] border border-white/10 bg-surface-container-low p-2">
              <p className="mb-2 px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-on-surface-variant">
                Drag driver chips onto P1/P2/P3
              </p>
              <div className="grid grid-cols-2 gap-2">
                {predictionDriverPool.map((driver) => (
                  <motion.button
                    key={`chip-${driver}`}
                    type="button"
                    drag={!postLocked}
                    dragSnapToOrigin
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onDragStart={() => setDraggingDriver(driver)}
                    onDragEnd={(_, info) => {
                      assignPodiumFromDrop(driver, info.point.x, info.point.y);
                      setDraggingDriver(null);
                    }}
                    onClick={() => !postLocked && updateField("first", driver)}
                    className={`haptic-pill rounded-full border border-white/15 px-3 py-2 text-left text-xs ${draggingDriver === driver ? "text-primary" : "text-on-surface"}`}
                  >
                    {driver}
                  </motion.button>
                ))}
              </div>
            </div>

            <select
              value={form.first}
              onChange={(event) => updateField("first", event.target.value)}
              className="hidden w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {predictionDriverPool.map((driver) => (
                <option key={`p1-${driver}`} value={driver}>
                  P1 - {driver}
                </option>
              ))}
            </select>

            <select
              value={form.second}
              onChange={(event) => updateField("second", event.target.value)}
              className="hidden w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-secondary"
            >
              {predictionDriverPool.map((driver) => (
                <option key={`p2-${driver}`} value={driver}>
                  P2 - {driver}
                </option>
              ))}
            </select>

            <select
              value={form.third}
              onChange={(event) => updateField("third", event.target.value)}
              className="hidden w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-tertiary"
            >
              {predictionDriverPool.map((driver) => (
                <option key={`p3-${driver}`} value={driver}>
                  P3 - {driver}
                </option>
              ))}
            </select>

            <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Pole Position
            </p>
            <select
              value={form.pole}
              onChange={(event) => updateField("pole", event.target.value)}
              className="w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {predictionDriverPool.map((driver) => (
                <option key={`pole-${driver}`} value={driver}>
                  {driver}
                </option>
              ))}
            </select>

            <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Driver of the Day
            </p>
            <select
              value={form.dotd}
              onChange={(event) => updateField("dotd", event.target.value)}
              className="w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-secondary"
            >
              {predictionDriverPool.map((driver) => (
                <option key={`dotd-${driver}`} value={driver}>
                  {driver}
                </option>
              ))}
            </select>

            <button
              disabled={postLocked}
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 font-headline text-sm font-bold tracking-[0.2em] text-white uppercase disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant transition-transform hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {postLocked ? "Prediction Locked" : "Deploy Prediction"}
            </button>
          </form>

          <div className={`mt-4 border px-3 py-2 ${postLocked ? "border-tertiary/40 bg-[linear-gradient(130deg,rgba(0,229,255,0.12),rgba(124,58,237,0.2),rgba(255,255,255,0.06))]" : "border-alert-red/20 bg-alert-red/10"}`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-alert-red">
              {postLocked
                ? "Predictions frozen in holographic lock state."
                : "Predictions auto-lock exactly 1 hour before qualifying."}
            </p>
            {submitError && (
              <p className="mt-2 text-xs text-alert-red">{submitError}</p>
            )}
          </div>

          <div className="mt-6 border-t border-outline-variant/20 pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
              Strategy Multiplier
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-secondary">
                <Trophy className="h-3.5 w-3.5" />
                x1.45 Sim Reward
              </span>
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Clock3 className="h-3.5 w-3.5" />
                {relativeNowLabel()}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
