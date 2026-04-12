"use client";

import { useCallback, useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import type { ApiDriverStanding, ApiTeamStanding } from "@/lib/types";
import { fetchDriverStandings, fetchTeamStandings } from "@/lib/api";
import { Podium } from "./podium";
import { StandingsList } from "./standings-list";
import { ConstructorsView } from "./constructors-view";
import { getTeamColor } from "@/lib/team-colors";
import { fastFade, iosSpring, modalSpring, routeVariants, skeletonPulse } from "@/components/motion/premium-motion";
import { createPortal } from "react-dom";

type Tab = "drivers" | "constructors";

/** Stable across SSR + browser (default locale differs for 12h vs 24h). */
function formatFetchedClock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function getAvatarSrc(driverName: string): string {
  const firstName = driverName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  return `/api/avatar/${firstName}`;
}

function subscribe() {
  return () => {};
}

export type StandingsScreenProps = {
  initialDrivers?: ApiDriverStanding[];
  initialTeams?: ApiTeamStanding[];
  initialFetchedAt?: string;
};

export function StandingsScreen({
  initialDrivers,
  initialTeams,
  initialFetchedAt,
}: StandingsScreenProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const [tab, setTab] = useState<Tab>("drivers");
  const [drivers, setDrivers] = useState<ApiDriverStanding[]>(initialDrivers ?? []);
  const [teams, setTeams] = useState<ApiTeamStanding[]>(initialTeams ?? []);
  const [fetchedAt, setFetchedAt] = useState<string | null>(initialFetchedAt ?? null);
  const [loading, setLoading] = useState(!(initialDrivers && initialTeams));
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState(initialDrivers?.[0]?.driverCode ?? "");
  const [refreshing, setRefreshing] = useState(false);
  const [modalDriverCode, setModalDriverCode] = useState("");
  const [modalTeamName, setModalTeamName] = useState("");
  /** Pixel box matching intrinsic video aspect (scaled), so object-contain has no letterboxing */
  const [driverVideoBox, setDriverVideoBox] = useState<{ w: number; h: number } | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [dRes, tRes] = await Promise.all([
        fetchDriverStandings(),
        fetchTeamStandings(),
      ]);
      setDrivers(dRes.data);
      setTeams(tRes.data);
      setFetchedAt(dRes.meta.fetchedAt);
      if (!selectedCode && dRes.data.length > 0) {
        setSelectedCode(dRes.data[0].driverCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch standings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // If the server already gave us initial data, skip the initial client wait.
    if (!initialDrivers || !initialTeams) loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const modalDriver = useMemo(
    () => drivers.find((d) => d.driverCode === modalDriverCode) ?? null,
    [drivers, modalDriverCode],
  );
  const modalTeam = useMemo(
    () => teams.find((t) => t.teamName === modalTeamName) ?? null,
    [teams, modalTeamName],
  );
  const modalTeamDrivers = useMemo(
    () => (modalTeam ? drivers.filter((d) => d.teamName === modalTeam.teamName) : []),
    [drivers, modalTeam],
  );
  const closeModal = () => {
    setModalDriverCode("");
    setModalTeamName("");
  };
  const modalOpen = !!(modalDriver || modalTeam);

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    setDriverVideoBox(null);
  }, [modalDriverCode]);

  const measureDriverAvatarBox = useCallback((el: HTMLVideoElement) => {
    const vw = el.videoWidth;
    const vh = el.videoHeight;
    if (!vw || !vh) return;
    const maxW = 108;
    const maxH = 128;
    const scale = Math.min(maxW / vw, maxH / vh, 1);
    setDriverVideoBox({
      w: Math.max(1, Math.round(vw * scale)),
      h: Math.max(1, Math.round(vh * scale)),
    });
  }, []);

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <WifiOff className="h-12 w-12 text-alert-red" />
        <p className="font-mono text-sm text-alert-red">{error}</p>
        <p className="max-w-md text-center font-mono text-xs text-on-surface-variant">
          Make sure the Paddock Data Agent is reachable from this frontend.
        </p>
        <button
          onClick={handleRefresh}
          className="mt-2 flex items-center gap-2 bg-primary px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-base"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      {loading ? (
        <motion.div
          key="standings-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fastFade}
          className="grid gap-4"
        >
          <motion.div variants={skeletonPulse} initial="initial" animate="animate" className="skeleton-shimmer h-24 rounded-[24px]" />
          <motion.div variants={skeletonPulse} initial="initial" animate="animate" className="skeleton-shimmer h-12 w-56 rounded-full" />
          <motion.div variants={skeletonPulse} initial="initial" animate="animate" className="skeleton-shimmer h-56 rounded-[24px]" />
          <motion.div variants={skeletonPulse} initial="initial" animate="animate" className="skeleton-shimmer h-64 rounded-[24px]" />
        </motion.div>
      ) : (
    <motion.div
      key="standings-loaded"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fastFade}
    >
      {/* Header */}
      <div className="mb-5 flex items-end justify-between border-b border-white/15 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-secondary" />
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-secondary">
              Live from Paddock Data Agent
            </p>
          </div>
          <h2 className="mt-1 font-headline text-3xl font-bold">Championship Standings</h2>
          <p className="mt-0.5 font-mono text-[10px] text-on-surface-variant">
            2026 Season — {drivers.length} drivers — {teams.length} constructors
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <div className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant">
              <Clock className="h-3 w-3" />
              {formatFetchedClock(fetchedAt)}
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant transition hover:border-secondary/40 hover:text-secondary disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-md w-fit">
        {([
          { key: "drivers" as Tab, label: "Drivers", icon: <Trophy className="h-3.5 w-3.5" /> },
          { key: "constructors" as Tab, label: "Constructors", icon: <Users className="h-3.5 w-3.5" /> },
        ]).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`haptic-pill flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-wider transition ${
              tab === key
                ? "team-accent-bg team-accent-text"
                : "text-on-surface-variant hover:bg-white/10 hover:text-on-surface"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="popLayout">
        {tab === "drivers" ? (
          <motion.div
            key="drivers"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastFade}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-12 xl:col-span-8">
              <Podium
                topThree={drivers.slice(0, 3)}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                onOpenDriver={(code) => {
                  setSelectedCode(code);
                  setModalDriverCode(code);
                  setModalTeamName("");
                }}
              />
              <StandingsList
                drivers={drivers.slice(3)}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                onOpenDriver={(code) => {
                  setSelectedCode(code);
                  setModalDriverCode(code);
                  setModalTeamName("");
                }}
                leaderPoints={drivers[0]?.points ?? 1}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="constructors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fastFade}
          >
            <ConstructorsView
              teams={teams}
              drivers={drivers}
              onOpenTeam={(teamName) => {
                setModalTeamName(teamName);
                setModalDriverCode("");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {mounted
        ? createPortal(
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-95 bg-transparent p-3 pb-[calc(5.6rem+env(safe-area-inset-bottom))] sm:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={modalSpring}
              className="dashboard-panel premium-scrollbar mx-auto h-[calc(100dvh-8.2rem)] w-full max-w-2xl overflow-y-auto rounded-card px-4 py-4 sm:px-5 sm:py-5"
              onClick={(event) => event.stopPropagation()}
            >
              {modalDriver ? (
                <>
                  <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Driver Detail</p>
                      <h3 className="mt-1 wrap-break-word font-headline text-xl font-semibold leading-snug sm:text-2xl">
                        {modalDriver.driverName}
                      </h3>
                    </div>
                    <div
                      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-outline-variant/25 bg-slate-900"
                      style={
                        driverVideoBox
                          ? { width: driverVideoBox.w, height: driverVideoBox.h }
                          : { width: 80, height: 96 }
                      }
                    >
                      <video
                        key={getAvatarSrc(modalDriver.driverName)}
                        src={getAvatarSrc(modalDriver.driverName)}
                        className="block h-full w-full object-contain"
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(e) => measureDriverAvatarBox(e.currentTarget)}
                        onLoadedData={(e) => measureDriverAvatarBox(e.currentTarget)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded border border-outline-variant/25 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Position</p>
                      <p className="mt-1 font-mono text-2xl font-semibold" style={{ color: getTeamColor(modalDriver.teamName).accent }}>
                        P{modalDriver.position}
                      </p>
                    </div>
                    <div className="rounded border border-outline-variant/25 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Points</p>
                      <p className="mt-1 font-mono text-2xl font-semibold" style={{ color: getTeamColor(modalDriver.teamName).accent }}>
                        {modalDriver.points}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded border border-outline-variant/25 bg-surface-container-low p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Team</p>
                    <p className="mt-1 font-headline text-lg font-semibold" style={{ color: getTeamColor(modalDriver.teamName).accent }}>
                      {modalDriver.teamName}
                    </p>
                  </div>
                  <div className="mt-3 rounded border border-outline-variant/25 bg-surface-container-low p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Gap To Leader</p>
                    <p className="mt-1 font-mono text-lg font-semibold text-on-surface">
                      {drivers[0]?.driverCode === modalDriver.driverCode
                        ? "Leader"
                        : `${Math.max((drivers[0]?.points ?? modalDriver.points) - modalDriver.points, 0)} pts`}
                    </p>
                  </div>
                  <div className="mt-3 rounded border border-outline-variant/25 bg-surface-container-low p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Nearby Rivals</p>
                    <div className="mt-2 space-y-2">
                      {drivers
                        .filter((d) => Math.abs(d.position - modalDriver.position) <= 1 && d.driverCode !== modalDriver.driverCode)
                        .slice(0, 2)
                        .map((rival) => (
                          <div key={rival.driverCode} className="flex items-center justify-between">
                            <p className="font-headline text-sm font-semibold">{rival.driverName}</p>
                            <p className="font-mono text-[11px] text-on-surface-variant">
                              P{rival.position} · {rival.points} pts
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : modalTeam ? (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Team Detail</p>
                  <h3 className="mt-1 font-headline text-2xl">{modalTeam.teamName}</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant">Constructor Championship</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded border border-outline-variant/25 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Position</p>
                      <p className="mt-1 font-mono text-2xl font-bold" style={{ color: getTeamColor(modalTeam.teamName).accent }}>
                        P{modalTeam.position}
                      </p>
                    </div>
                    <div className="rounded border border-outline-variant/25 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Points</p>
                      <p className="mt-1 font-mono text-2xl font-bold" style={{ color: getTeamColor(modalTeam.teamName).accent }}>
                        {modalTeam.points}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {modalTeamDrivers.map((driver) => (
                      <div key={driver.driverCode} className="rounded border border-outline-variant/25 bg-surface-container-low px-3 py-2">
                        <p className="font-headline text-sm">{driver.driverName}</p>
                        <p className="font-mono text-[10px] text-on-surface-variant">
                          {driver.driverCode} · P{driver.position} · {driver.points} pts
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded border border-outline-variant/25 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Share Of Leader</p>
                      <p className="mt-1 font-mono text-lg font-bold text-on-surface">
                        {teams[0]?.points ? `${Math.round((modalTeam.points / teams[0].points) * 100)}%` : "0%"}
                      </p>
                    </div>
                    <div className="rounded border border-outline-variant/25 bg-surface-container-low p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Drivers</p>
                      <p className="mt-1 font-mono text-lg font-bold text-on-surface">{modalTeamDrivers.length}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      , document.body)
        : null}
    </motion.div>
      )}
    </AnimatePresence>
  );
}
