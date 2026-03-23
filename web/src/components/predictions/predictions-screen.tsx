"use client";

import { predictionConfig, predictionDriverPool, racePredictions as seededPredictions } from "@/lib/mock-data";
import { RacePrediction } from "@/lib/types";
import { Clock3, Heart, MessageSquarePlus, Trophy } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type PredictionForm = {
  first: string;
  second: string;
  third: string;
  pole: string;
  dotd: string;
};

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
  const [predictions, setPredictions] = useState<RacePrediction[]>(seededPredictions);
  const [msUntilQualifying, setMsUntilQualifying] = useState(() => {
    const qualifyingMs = new Date(predictionConfig.qualifyingAtIso).getTime();
    return qualifyingMs - Date.now();
  });
  const [form, setForm] = useState<PredictionForm>({
    first: predictionDriverPool[0],
    second: predictionDriverPool[1],
    third: predictionDriverPool[2],
    pole: predictionDriverPool[0],
    dotd: predictionDriverPool[3],
  });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const qualifyingMs = new Date(predictionConfig.qualifyingAtIso).getTime();
      setMsUntilQualifying(qualifyingMs - Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const postLocked = msUntilQualifying <= 60 * 60 * 1000;
  const lockText = postLocked ? "LOCKED" : "ACTIVE";
  const countdown = formatCountdown(msUntilQualifying);

  const sortedPredictions = useMemo(
    () => [...predictions].sort((a, b) => b.likes - a.likes),
    [predictions],
  );

  const updateField = (field: keyof PredictionForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const likePrediction = (id: string) => {
    setPredictions((prev) =>
      prev.map((prediction) =>
        prediction.id === id ? { ...prediction, likes: prediction.likes + 1 } : prediction,
      ),
    );
  };

  const submitPrediction = (event: FormEvent) => {
    event.preventDefault();
    setSubmitError("");

    if (postLocked) {
      setSubmitError("Transmission window closed. Predictions are locked in the final hour before qualifying.");
      return;
    }

    const podium = [form.first, form.second, form.third];
    const distinct = new Set(podium);

    if (distinct.size !== 3) {
      setSubmitError("Podium selection must contain three different drivers.");
      return;
    }

    const newPrediction: RacePrediction = {
      id: `pred-${Date.now()}`,
      username: "@you",
      fullName: "You",
      createdAt: "just now",
      top3: [form.first, form.second, form.third],
      polePosition: form.pole,
      driverOfTheDay: form.dotd,
      likes: 0,
    };

    setPredictions((prev) => [newPrediction, ...prev]);
  };

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
                Global Simulation Consensus: {predictionConfig.eventName}
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
          {sortedPredictions.map((prediction) => (
            <article key={prediction.id} className="dashboard-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-surface-container-high" />
                  <div>
                    <p className="font-headline text-base">{prediction.fullName}</p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                      {prediction.username} {"//"} {prediction.createdAt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => likePrediction(prediction.id)}
                  className="flex items-center gap-1 border border-outline-variant/30 px-2 py-1 text-xs text-on-surface-variant hover:border-primary/40 hover:text-primary"
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
            Lat: {predictionConfig.lat}
          </p>

          <form onSubmit={submitPrediction} className="mt-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Podium Selection</p>

            <select
              value={form.first}
              onChange={(event) => updateField("first", event.target.value)}
              className="w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
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
              className="w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-secondary"
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
              className="w-full border border-outline-variant/35 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-tertiary"
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
              className="mt-2 flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 font-headline text-sm font-bold tracking-[0.2em] text-black uppercase disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {postLocked ? "Prediction Locked" : "Deploy Prediction"}
            </button>
          </form>

          <div className="mt-4 border border-alert-red/20 bg-alert-red/10 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-alert-red">
              {postLocked
                ? "Transmission window closed. Last hour before qualifying."
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
