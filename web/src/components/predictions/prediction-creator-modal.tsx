"use client";

import { useEffect, useRef, useState, useSyncExternalStore, FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { predictionDriverPool } from "@/lib/mock-data";

type PredictionForm = {
  first: string;
  second: string;
  third: string;
  pole: string;
  dotd: string;
};

function subscribe() {
  return () => {};
}

function formatCountdown(ms: number) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export type PredictionCreatorModalProps = {
  open: boolean;
  onClose: () => void;
  /** Supabase `prediction_config.id`; null = not linked in DB */
  eventId: string | null;
  eventTitle: string;
  qualifyingAtMs: number;
  onSubmitted: () => void;
};

export function PredictionCreatorModal({
  open,
  onClose,
  eventId,
  eventTitle,
  qualifyingAtMs,
  onSubmitted,
}: PredictionCreatorModalProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
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

  useEffect(() => {
    if (!open) return;
    setSubmitError("");
    setForm({
      first: predictionDriverPool[0],
      second: predictionDriverPool[1],
      third: predictionDriverPool[2],
      pole: predictionDriverPool[0],
      dotd: predictionDriverPool[3],
    });
  }, [open, eventId, eventTitle]);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setMsUntilQualifying(qualifyingAtMs - Date.now()), 1000);
    setMsUntilQualifying(qualifyingAtMs - Date.now());
    return () => clearInterval(t);
  }, [open, qualifyingAtMs]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const postLocked = msUntilQualifying <= 60 * 60 * 1000;
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

  const submitPrediction = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!eventId) {
      setSubmitError("This Grand Prix is not linked in the database yet. Add a matching prediction_config row.");
      return;
    }
    if (postLocked) {
      setSubmitError("Window locked — predictions close 1 hour before qualifying.");
      return;
    }
    const podium = [form.first, form.second, form.third];
    if (new Set(podium).size !== 3) {
      setSubmitError("Podium picks must be three different drivers.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSubmitError("Sign in via Profile (Super License) to deploy a prediction.");
      return;
    }
    const { error } = await supabase.from("race_predictions").insert({
      profile_id: userData.user.id,
      event_id: eventId,
      top3: podium,
      pole_position: form.pole,
      driver_of_the_day: form.dotd,
    });
    if (error) {
      setSubmitError(error.message.includes("duplicate") ? "You already submitted for this Grand Prix." : error.message);
    } else {
      onSubmitted();
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center p-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4 sm:pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="prediction-creator-title"
            className="relative flex max-h-[min(88dvh,760px)] w-full max-w-lg flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.72 }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500">Deploy prediction</p>
                <h2 id="prediction-creator-title" className="font-headline text-lg font-bold tracking-tight text-slate-900">
                  {eventTitle}
                </h2>
                <p className="mt-1 font-mono text-xs tabular-nums text-slate-600">
                  Locks in <span className="text-primary">{countdown}</span>
                  {postLocked ? <span className="ml-2 text-amber-600">· locked</span> : null}
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="btn-premium btn-outline-glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-0 text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="premium-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {!eventId && (
                <p className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm text-amber-900">
                  No Supabase <code className="font-mono text-xs">prediction_config</code> row matches this Grand Prix
                  name yet. Add one with <code className="font-mono text-xs">event_name</code> containing a token
                  like &quot;miami&quot; or &quot;bahrain&quot;.
                </p>
              )}

              <form onSubmit={submitPrediction} className="space-y-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Podium</p>
                <div className={`grid grid-cols-3 gap-2 ${postLocked ? "opacity-60" : ""}`}>
                  {(
                    [
                      { key: "second" as const, label: "P2", ring: "border-violet-200", accent: "text-violet-600", value: form.second },
                      { key: "first" as const, label: "P1", ring: "border-primary/40", accent: "text-primary", value: form.first },
                      { key: "third" as const, label: "P3", ring: "border-cyan-200", accent: "text-cyan-700", value: form.third },
                    ] as const
                  ).map((slot) => (
                    <div
                      key={slot.key}
                      ref={zoneRefs[slot.key]}
                      className={`rounded-2xl border-2 ${slot.ring} bg-slate-50/80 p-3 text-center`}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${slot.accent}`}>{slot.label}</p>
                      <p className="mt-2 font-headline text-xs font-semibold text-slate-900">{slot.value.split(" ").pop()}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium text-slate-500">Drag a chip onto P1–P3</p>
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 sm:grid-cols-3">
                    {predictionDriverPool.map((driver) => (
                      <motion.button
                        key={driver}
                        type="button"
                        drag={!postLocked && !!eventId}
                        dragSnapToOrigin
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onDragStart={() => setDraggingDriver(driver)}
                        onDragEnd={(_, info) => {
                          assignPodiumFromDrop(driver, info.point.x, info.point.y);
                          setDraggingDriver(null);
                        }}
                        onClick={() => !postLocked && eventId && updateField("first", driver)}
                        className={`rounded-full border border-slate-200/90 bg-white px-2 py-2 text-left text-xs text-slate-800 shadow-sm ${
                          draggingDriver === driver ? "ring-2 ring-primary/30" : ""
                        }`}
                      >
                        {driver}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Pole position</label>
                    <select
                      value={form.pole}
                      onChange={(ev) => updateField("pole", ev.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary/50"
                    >
                      {predictionDriverPool.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500">Driver of the day</label>
                    <select
                      value={form.dotd}
                      onChange={(ev) => updateField("dotd", ev.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary/50"
                    >
                      {predictionDriverPool.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  disabled={postLocked || !eventId}
                  type="submit"
                  className="btn-premium btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-headline text-sm font-bold tracking-wide text-white disabled:cursor-not-allowed"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  {postLocked ? "Locked" : "Deploy prediction"}
                </button>
                {submitError ? <p className="text-center text-sm text-red-600">{submitError}</p> : null}
                <p className="text-center text-[11px] text-slate-500">
                  Tied to your Super License profile. One entry per Grand Prix.
                </p>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
