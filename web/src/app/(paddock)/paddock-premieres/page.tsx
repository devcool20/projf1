"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ScreeningEventRow, ScreeningVenueRow } from "@/lib/types";
import { formatScreeningDateLabel } from "@/lib/screenings";

type LoadOptions = {
  silent?: boolean;
};

type RaceCard = {
  id: string;
  title: string;
  dateLabel: string;
  startsAt: string;
  totalSeats: number;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  }
  return "Unknown error";
}

export default function PaddockPremieresPage() {
  const [races, setRaces] = useState<RaceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const primaryRace = useMemo(() => races[0], [races]);
  const nextRace = useMemo(() => races[1], [races]);

  const fetchData = useCallback(async (options?: LoadOptions) => {
    const silent = Boolean(options?.silent);
    if (!silent) setLoading(true);
    setLoadError("");

    try {
      const raceResult = await supabase
        .from("screening_events")
        .select("*")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(2);

      if (raceResult.error) throw raceResult.error;
      const raceRows = (raceResult.data ?? []) as ScreeningEventRow[];
      if (raceRows.length === 0) {
        setRaces([]);
        return;
      }

      const ids = raceRows.map((row) => row.id);
      const venuesResult = await supabase
        .from("screening_venues")
        .select("screening_id, capacity")
        .in("screening_id", ids)
        .eq("is_active", true);
      if (venuesResult.error) throw venuesResult.error;

      const seatsByRace: Record<string, number> = {};
      ((venuesResult.data ?? []) as Pick<ScreeningVenueRow, "screening_id" | "capacity">[]).forEach((row) => {
        seatsByRace[row.screening_id] = (seatsByRace[row.screening_id] ?? 0) + row.capacity;
      });

      setRaces(
        raceRows.map((row) => ({
          id: row.id,
          title: row.title,
          dateLabel: formatScreeningDateLabel(row.starts_at),
          startsAt: row.starts_at,
          totalSeats: seatsByRace[row.id] ?? 0,
        })),
      );
    } catch (error) {
      const message = toErrorMessage(error);
      setLoadError(`Could not load screenings. ${message}`);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel("screenings-home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "screening_events" }, () => void fetchData({ silent: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "screening_venues" }, () => void fetchData({ silent: true }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-4 pb-24">
        <div className="surface-ink p-6">
          <div className="skeleton-shimmer h-4 w-32 rounded" />
          <div className="skeleton-shimmer mt-3 h-8 w-2/3 rounded" />
          <div className="skeleton-shimmer mt-3 h-5 w-full rounded" />
        </div>
        <div className="dashboard-panel flex min-h-[260px] items-center justify-center p-4">
          <div className="inline-flex items-center gap-2 text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">Loading paddock premieres</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 pb-24">
      <section className="surface-ink p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">Paddock Premieres</p>
        <h1 className="mt-2 font-headline text-3xl font-bold text-white">Upcoming Race Screening</h1>
        <p className="mt-2 text-sm text-zinc-300">Live race first. Next race preview appears just below.</p>
      </section>

      {loadError && (
        <div className="dashboard-panel p-3 text-sm text-on-surface-variant">
          <p>{loadError}</p>
          <button type="button" onClick={() => void fetchData()} className="btn-premium btn-outline-glass mt-3 px-3 py-1.5 text-xs">
            Retry
          </button>
        </div>
      )}

      {!loadError && !primaryRace ? (
        <div className="dashboard-panel p-6">
          <p className="font-headline text-xl">No upcoming screenings configured</p>
          <p className="mt-2 text-sm text-on-surface-variant">Insert rows for Miami + Canadian screenings in Supabase.</p>
        </div>
      ) : primaryRace ? (
        <div className="grid grid-cols-12 gap-4">
          <section className="col-span-12 xl:col-span-8">
            <Link href={`/paddock-premieres/${primaryRace.id}`} className="dashboard-panel block overflow-hidden p-4 transition hover:border-primary/35 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-headline text-2xl leading-tight">{primaryRace.title}</h2>
                <span className="chip-premium">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {primaryRace.dateLabel}
                </span>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-xl border border-primary/20 bg-linear-to-r from-primary/6 via-white to-secondary/8 px-3 py-4">
                <div className="pointer-events-none absolute -left-20 top-0 h-full w-24 rotate-12 bg-white/40 blur-xl" />
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Total Seats (All Venues)</p>
                <p className="mt-1 font-headline text-3xl text-primary">{primaryRace.totalSeats}</p>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                  Choose venue
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </section>

          <aside className="col-span-12 xl:col-span-4">
            <div className="dashboard-panel p-4 sm:p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">Next Up After This</p>
              {nextRace ? (
                <div className="card-surface mt-3 p-4">
                  <h3 className="font-headline text-xl">{nextRace.title}</h3>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-on-surface-variant">
                    <Clock3 className="h-3.5 w-3.5" />
                    {nextRace.dateLabel}
                  </p>
                  <p className="mt-2 text-xs text-on-surface-variant">
                    Total seats planned: <span className="font-semibold text-on-surface">{nextRace.totalSeats}</span>
                  </p>
                  <p className="mt-3 text-xs text-on-surface-variant">This card is preview-only and intentionally not clickable.</p>
                </div>
              ) : (
                <div className="card-surface mt-3 p-4 text-sm text-on-surface-variant">Next race is not scheduled yet.</div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
