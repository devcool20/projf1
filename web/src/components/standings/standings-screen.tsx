"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Users, RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import type { ApiDriverStanding, ApiTeamStanding } from "@/lib/types";
import { fetchDriverStandings, fetchTeamStandings } from "@/lib/api";
import { Podium } from "./podium";
import { StandingsList } from "./standings-list";
import { DriverDetailPanel } from "./driver-detail-panel";
import { ConstructorsView } from "./constructors-view";

type Tab = "drivers" | "constructors";

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
  const [tab, setTab] = useState<Tab>("drivers");
  const [drivers, setDrivers] = useState<ApiDriverStanding[]>(initialDrivers ?? []);
  const [teams, setTeams] = useState<ApiTeamStanding[]>(initialTeams ?? []);
  const [fetchedAt, setFetchedAt] = useState<string | null>(initialFetchedAt ?? null);
  const [loading, setLoading] = useState(!(initialDrivers && initialTeams));
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState(initialDrivers?.[0]?.driverCode ?? "");
  const [refreshing, setRefreshing] = useState(false);

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

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.driverCode === selectedCode) ?? null,
    [drivers, selectedCode],
  );

  const totalDriverPoints = useMemo(
    () => drivers.reduce((sum, d) => sum + d.points, 0),
    [drivers],
  );

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="skeleton-shimmer h-56 rounded-[24px]" />
        <div className="skeleton-shimmer h-56 rounded-[24px]" />
        <div className="skeleton-shimmer h-64 rounded-[24px] md:col-span-2" />
      </div>
    );
  }

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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
            2026 Season — {drivers.length} drivers — {teams.length} constructors — {totalDriverPoints} total points scored
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetchedAt && (
            <div className="flex items-center gap-1 font-mono text-[10px] text-on-surface-variant">
              <Clock className="h-3 w-3" />
              {new Date(fetchedAt).toLocaleTimeString()}
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
      <AnimatePresence mode="wait">
        {tab === "drivers" ? (
          <motion.div
            key="drivers"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-12 xl:col-span-8">
              <Podium
                topThree={drivers.slice(0, 3)}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
              />
              <StandingsList
                drivers={drivers.slice(3)}
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                leaderPoints={drivers[0]?.points ?? 1}
              />
            </div>
            <aside className="col-span-12 xl:col-span-4">
              <DriverDetailPanel driver={selectedDriver} allDrivers={drivers} />
            </aside>
          </motion.div>
        ) : (
          <motion.div
            key="constructors"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            <ConstructorsView teams={teams} drivers={drivers} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
