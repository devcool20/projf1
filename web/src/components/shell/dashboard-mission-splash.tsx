"use client";

import { BoltIcon, SignalIcon } from "@heroicons/react/24/outline";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

type DashboardMissionSplashProps = {
  /** Bumps when a new splash run should start (e.g. navigating back to `/`). */
  runKey: number;
  onComplete: () => void;
};

const BG = "#02050c";
const PRIMARY = "#7c3aed";
const TERTIARY = "#00e5ff";
const MIN_SPLASH_SECONDS = 5;

/** Six-step type scale (xs → hero); Manrope only via `font-body`. */
const sz = {
  xs: "text-[0.625rem]",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  hero: "text-[clamp(2.5rem,10vw,6.5rem)]",
} as const;

export function DashboardMissionSplash({ runKey, onComplete }: DashboardMissionSplashProps) {
  const progress = useMotionValue(0);
  const widthPct = useTransform(progress, (v) => `${v}%`);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    progress.set(0);

    const run = async () => {
      await animate(progress, 100, {
        duration: MIN_SPLASH_SECONDS,
        ease: [0.22, 1, 0.36, 1],
      });
      if (cancelled) return;
      if (cancelled) return;
      onCompleteRef.current();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [runKey, progress]);

  return (
    <motion.div
      role="status"
      aria-busy="true"
      aria-live="polite"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="dashboard-splash-root fixed inset-0 flex h-dvh w-screen flex-col items-center justify-center overflow-hidden px-3 font-body text-white antialiased selection:bg-primary/30 selection:text-white sm:px-6"
      style={{ backgroundColor: BG, zIndex: 300 }}
    >
      {/* Decorative layers */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="dashboard-splash-aura-primary absolute -left-[10%] -top-[20%] h-[70%] w-[70%] blur-[120px]" />
        <div className="dashboard-splash-aura-tertiary absolute -bottom-[20%] -right-[10%] h-[70%] w-[70%] blur-[120px]" />
        <div
          className="dashboard-splash-noise absolute inset-0 opacity-[0.035] mix-blend-overlay"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex w-[min(92vw,640px)] origin-center scale-[0.82] flex-col items-center gap-10 sm:scale-[0.74] sm:gap-14 md:scale-[0.66]">
        <div className="flex flex-col items-center gap-5">
          <h1
            className={`${sz.hero} dashboard-splash-title-glow font-black uppercase leading-[1.08] tracking-[-0.03em]`}
          >
            projf1
          </h1>
          <div className="flex flex-col items-center gap-4">
            <span
              className={`${sz.xs} font-semibold uppercase tracking-[0.28em] sm:tracking-[0.45em]`}
              style={{ color: `${PRIMARY}99` }}
            >
              Initializing mission control
            </span>
            <div className="flex items-center gap-3" aria-hidden>
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: PRIMARY }}
              />
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `${PRIMARY}66` }} />
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `${PRIMARY}33` }} />
            </div>
          </div>
        </div>

        <div className="dashboard-splash-card group w-full rounded-2xl border border-white/8 bg-white/3 p-5 shadow-[0_24px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1">
                <p
                  className={`${sz.xs} font-bold uppercase tracking-widest`}
                  style={{ color: `${PRIMARY}66` }}
                >
                  System status
                </p>
                <p className={`${sz.sm} font-medium text-white/90`}>Synchronizing grid data</p>
              </div>
              <p
                className={`${sz.lg} font-bold leading-[1.1] tracking-[-0.03em] transition-transform duration-500 group-hover:scale-105`}
                style={{ color: PRIMARY }}
              >
                <ProgressReadout mv={progress} />%
              </p>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: `${PRIMARY}1a` }}>
              <motion.div
                className="h-full rounded-full shadow-[0_0_15px_rgba(124,58,237,0.45)]"
                style={{
                  width: widthPct,
                  backgroundColor: PRIMARY,
                }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-5">
            <div className="dashboard-splash-tile rounded-xl border border-white/5 bg-white/5 p-3 sm:p-5">
              <span className={`${sz.xs} font-bold uppercase tracking-widest`} style={{ color: `${TERTIARY}99` }}>
                Uplink
              </span>
              <div className="mt-2 flex items-center gap-2 sm:gap-3">
                <SignalIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" style={{ color: TERTIARY }} aria-hidden />
                <span className="block min-w-0 truncate text-[0.78rem] font-semibold text-white/82 sm:text-sm">
                  SECURE_LINK_08
                </span>
              </div>
            </div>
            <div className="dashboard-splash-tile rounded-xl border border-white/5 bg-white/5 p-3 sm:p-5">
              <span className={`${sz.xs} font-bold uppercase tracking-widest`} style={{ color: `${TERTIARY}99` }}>
                Velocity
              </span>
              <div className="mt-2 flex items-center gap-2 sm:gap-3">
                <BoltIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" style={{ color: TERTIARY }} aria-hidden />
                <span className="block min-w-0 whitespace-nowrap text-[0.78rem] font-semibold text-white/82 sm:text-sm">
                  942.5 MB/S
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-7 left-0 right-0 z-10 hidden justify-center sm:bottom-16 sm:flex">
        <div className="flex gap-16 text-white/20">
          {[
            { label: "Core", value: "v4.2.0" },
            { label: "Region", value: "Global_North" },
            { label: "Engine", value: "Vector_X" },
          ].map((row) => (
            <div key={row.label} className="group flex cursor-default flex-col items-center gap-1">
              <span
                className={`${sz.xs} font-bold uppercase tracking-[0.2em] transition-colors group-hover:text-primary/50`}
              >
                {row.label}
              </span>
              <span className={`${sz.xs} opacity-40`}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none fixed left-12 top-12 z-10 hidden opacity-30 lg:block">
        <div className="mb-5 h-px w-32" style={{ backgroundColor: PRIMARY }} />
        <p className={`${sz.xs} font-bold uppercase tracking-[0.4em] text-white/90`}>Paddock OS</p>
        <p className={`${sz.xs} mt-1`} style={{ color: `${PRIMARY}99` }}>
          Issue 2026.04 // High velocity data
        </p>
      </div>
      <div className="pointer-events-none fixed right-12 top-12 z-10 hidden text-right opacity-30 lg:block">
        <p className={`${sz.xs} font-bold uppercase tracking-[0.4em]`} style={{ color: PRIMARY }}>
          Premium access
        </p>
        <p className={`${sz.xs} mt-1 text-white/60`}>Authorized personnel only</p>
        <div className="ml-auto mt-5 h-px w-32" style={{ backgroundColor: PRIMARY }} />
      </div>
    </motion.div>
  );
}

function ProgressReadout({ mv }: { mv: ReturnType<typeof useMotionValue<number>> }) {
  const [n, setN] = useState(0);
  useMotionValueEvent(mv, "change", (v) => setN(Math.round(v)));
  return <span>{n}</span>;
}
