"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Loader2, MapPin, Monitor, UtensilsCrossed, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ScreeningEventRow, ScreeningVenueBookingRow, ScreeningVenueRow } from "@/lib/types";
import { formatScreeningDateLabel } from "@/lib/screenings";

type ScreeningVenueView = {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  bookedSeats: number;
  entryFee: number;
  seatsLeft: number;
  screeningTiming: string;
  foodTiming: string;
  availability: string[];
  screenSize: string;
  photoUrl: string;
};

type ScreeningView = {
  id: string;
  title: string;
  dateLabel: string;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim().length > 0) return maybeMessage;
    const maybeDetails = (error as { details?: unknown }).details;
    if (typeof maybeDetails === "string" && maybeDetails.trim().length > 0) return maybeDetails;
  }
  return "Unknown error";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function mapVenue(row: ScreeningVenueRow): ScreeningVenueView {
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    address: row.address,
    capacity: row.capacity,
    bookedSeats: row.booked_seats,
    entryFee: row.entry_fee,
    seatsLeft: Math.max(row.capacity - row.booked_seats, 0),
    screeningTiming: row.screening_timing ?? "",
    foodTiming: row.food_timing ?? "",
    availability: row.availability ?? [],
    screenSize: row.screen_size ?? "",
    photoUrl: row.photo_url ?? "",
  };
}

export default function ScreeningVenuePage() {
  const routeParams = useParams<{ screeningId: string }>();
  const screeningId = routeParams.screeningId;
  const [screening, setScreening] = useState<ScreeningView | null>(null);
  const [venues, setVenues] = useState<ScreeningVenueView[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [bookingByVenue, setBookingByVenue] = useState<Record<string, number>>({});
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [seatCount, setSeatCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? venues[0] ?? null,
    [venues, selectedVenueId],
  );

  const existingSeats = selectedVenue ? bookingByVenue[selectedVenue.id] ?? 0 : 0;
  const maxSelectableSeats = selectedVenue ? Math.max(selectedVenue.seatsLeft + existingSeats, existingSeats) : 0;
  const totalAmount = selectedVenue ? selectedVenue.entryFee * seatCount : 0;

  const fetchData = useCallback(async (silent = false) => {
    if (!screeningId) return;
    if (!silent) setLoading(true);
    setLoadError("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData.user?.id ?? null;
      setUserId(currentUserId);

      const screeningResult = await supabase.from("screening_events").select("id, title, starts_at").eq("id", screeningId).single();
      if (screeningResult.error) throw screeningResult.error;

      const screeningRow = screeningResult.data as Pick<ScreeningEventRow, "id" | "title" | "starts_at">;
      setScreening({
        id: screeningRow.id,
        title: screeningRow.title,
        dateLabel: formatScreeningDateLabel(screeningRow.starts_at),
      });

      const venuesResult = await supabase
        .from("screening_venues")
        .select("*")
        .eq("screening_id", screeningId)
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (venuesResult.error) throw venuesResult.error;

      const mappedVenues = ((venuesResult.data ?? []) as ScreeningVenueRow[]).map(mapVenue);
      setVenues(mappedVenues);

      if (!selectedVenueId && mappedVenues.length > 0) {
        setSelectedVenueId(mappedVenues[0].id);
      } else if (selectedVenueId && !mappedVenues.some((venue) => venue.id === selectedVenueId)) {
        setSelectedVenueId(mappedVenues[0]?.id ?? "");
      }

      if (!currentUserId) {
        setBookingByVenue({});
        return;
      }

      const bookingResult = await supabase
        .from("screening_venue_bookings")
        .select("id, venue_id, profile_id, seat_count, created_at, updated_at")
        .eq("profile_id", currentUserId);
      if (bookingResult.error) throw bookingResult.error;

      const map: Record<string, number> = {};
      ((bookingResult.data ?? []) as ScreeningVenueBookingRow[]).forEach((row) => {
        map[row.venue_id] = row.seat_count;
      });
      setBookingByVenue(map);
    } catch (error) {
      const message = toErrorMessage(error);
      setLoadError(`Could not load venue data. ${message}`);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [screeningId, selectedVenueId]);

  useEffect(() => {
    if (!screeningId) return;
    void fetchData(false);
  }, [fetchData, screeningId]);

  useEffect(() => {
    if (!screeningId) return;
    const channel = supabase
      .channel(`screenings-venues-${screeningId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "screening_venues" }, () => void fetchData(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "screening_venue_bookings" }, () => void fetchData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, screeningId]);

  useEffect(() => {
    if (!selectedVenue) return;
    const booked = bookingByVenue[selectedVenue.id] ?? 0;
    setSeatCount(booked > 0 ? booked : 1);
    setBookingError("");
  }, [selectedVenue, bookingByVenue]);

  const openBookingModal = () => {
    if (!selectedVenue) return;
    setBookingError("");
    setBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setBookingModalOpen(false);
    setBookingError("");
  };

  const onBook = async () => {
    if (!selectedVenue) return;
    if (!userId) {
      setBookingError("Sign in via Super License to book.");
      return;
    }

    setBookingError("");
    setIsSaving(true);

    const { error } = await supabase.rpc("upsert_screening_venue_booking", {
      p_venue_id: selectedVenue.id,
      p_seat_count: seatCount,
    });

    if (error) {
      setBookingError(error.message ?? "Booking failed.");
      setIsSaving(false);
      return;
    }

    await fetchData(true);
    setIsSaving(false);
    closeBookingModal();
  };

  const onCancelBooking = async () => {
    if (!selectedVenue) return;
    setBookingError("");
    setIsCancelling(true);

    const { error } = await supabase.rpc("cancel_screening_venue_booking", {
      p_venue_id: selectedVenue.id,
    });

    if (error) {
      setBookingError(error.message ?? "Cancel failed.");
      setIsCancelling(false);
      return;
    }

    await fetchData(true);
    setIsCancelling(false);
    closeBookingModal();
  };

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="surface-ink p-6">
          <div className="skeleton-shimmer h-4 w-32 rounded" />
          <div className="skeleton-shimmer mt-3 h-8 w-2/3 rounded" />
        </div>
        <div className="dashboard-panel flex min-h-[280px] items-center justify-center p-4">
          <div className="inline-flex items-center gap-2 text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="font-mono text-xs uppercase tracking-[0.2em]">Loading venues</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-24">
      <section className="surface-ink p-5 sm:p-6">
        <Link href="/paddock-premieres" className="mb-3 inline-flex items-center gap-2 text-xs text-zinc-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to races
        </Link>
        <h1 className="font-headline text-3xl font-bold text-white">{screening?.title ?? "Race Screening"}</h1>
        <p className="mt-2 inline-flex items-center gap-1 text-sm text-zinc-300">
          <CalendarDays className="h-4 w-4" />
          {screening?.dateLabel ?? ""}
        </p>
      </section>

      {loadError && (
        <div className="dashboard-panel p-3 text-sm text-on-surface-variant">
          <p>{loadError}</p>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-12 xl:order-2 xl:col-span-7">
          {selectedVenue ? (
            <motion.div
              key={selectedVenue.id}
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="dashboard-panel p-4 sm:p-5"
            >
              {selectedVenue.photoUrl ? (
                <img
                  src={selectedVenue.photoUrl}
                  alt={selectedVenue.name}
                  className="h-56 w-full rounded-xl object-cover sm:h-64"
                />
              ) : (
                <div className="card-surface h-56 w-full rounded-xl sm:h-64" />
              )}

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="card-surface p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Venue</p>
                  <p className="mt-1 font-headline text-xl">{selectedVenue.name}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Address</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{selectedVenue.address}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Screening Timing</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{selectedVenue.screeningTiming || "Not set"}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Food Timing</p>
                  <p className="mt-1 text-sm text-on-surface-variant">{selectedVenue.foodTiming || "Not set"}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                    <Monitor className="h-3.5 w-3.5" />
                    Screen Size
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">{selectedVenue.screenSize || "Not set"}</p>
                </div>
                <div className="card-surface p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Capacity</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {selectedVenue.bookedSeats} booked / {selectedVenue.capacity} total
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{selectedVenue.seatsLeft} seats left</p>
                </div>
                <div className="card-surface p-3 sm:col-span-2">
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                    <UtensilsCrossed className="h-3.5 w-3.5" />
                    Available
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(selectedVenue.availability.length > 0 ? selectedVenue.availability : ["Not set"]).map((item) => (
                      <span key={item} className="chip-premium rounded-lg! px-2! py-1! text-[11px]!">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={openBookingModal}
                  className="btn-premium btn-primary w-full px-4 py-3 font-headline text-sm font-bold tracking-[0.2em] text-white uppercase transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(124,58,237,0.38)]"
                >
                  Book Seats
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="dashboard-panel p-5 text-sm text-on-surface-variant">Select a venue to view details.</div>
          )}
        </aside>

        <section className="col-span-12 xl:order-1 xl:col-span-5">
          <div className="dashboard-panel p-4 sm:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-on-surface-variant">Venue Selection</p>
            {venues.length === 0 ? (
              <div className="card-surface mt-3 p-4 text-sm text-on-surface-variant">No active venues configured yet.</div>
            ) : (
              <div className="mt-3 space-y-3">
                {venues.map((venue) => {
                  const selected = selectedVenue?.id === venue.id;
                  return (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => setSelectedVenueId(venue.id)}
                      className={`card-surface w-full p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/35 ${selected ? "border-primary/45 shadow-[0_0_0_1px_rgba(124,58,237,0.25)]" : ""}`}
                    >
                      <div className="flex gap-3">
                        {venue.photoUrl ? (
                          <img src={venue.photoUrl} alt={venue.name} className="h-20 w-24 rounded-lg object-cover" />
                        ) : (
                          <div className="h-20 w-24 rounded-lg bg-surface-container" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-headline text-lg">{venue.name}</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-on-surface-variant">
                            <MapPin className="h-3.5 w-3.5" />
                            {venue.city}
                          </p>
                          <p className="mt-1 text-xs text-on-surface-variant">{venue.seatsLeft} left · Rs. {formatCurrency(venue.entryFee)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {bookingModalOpen && selectedVenue && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-220 flex items-end justify-center bg-black/55 p-3 backdrop-blur-[3px] sm:items-center sm:p-4"
          >
            <button type="button" className="absolute inset-0 cursor-default" onClick={closeBookingModal} aria-label="Close modal" />
            <motion.div
              initial={{ y: 30, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 26, scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-[#090c16]/90 p-4 text-zinc-100 shadow-[0_26px_80px_rgba(3,6,16,0.72)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-x-0 -top-24 h-36 bg-linear-to-b from-primary/25 via-secondary/15 to-transparent blur-2xl" />
              <button
                type="button"
                onClick={closeBookingModal}
                className="absolute right-3 top-3 rounded-full border border-white/15 bg-white/8 p-1.5 text-zinc-300 backdrop-blur-md transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Booking Modal</p>
              <h2 className="mt-2 font-headline text-xl text-white">{selectedVenue.name}</h2>

              {selectedVenue.photoUrl ? (
                <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10">
                  <img src={selectedVenue.photoUrl} alt={selectedVenue.name} className="h-40 w-full object-cover brightness-110" />
                  <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-white/12 bg-white/4 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">Seat Quantity</p>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSeatCount((prev) => Math.max(1, prev - 1))}
                    disabled={seatCount <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-lg text-zinc-100 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-white/14 disabled:opacity-35"
                  >
                    -
                  </button>
                  <div className="text-center">
                    <p className="font-headline text-3xl text-white">{seatCount}</p>
                    <p className="text-[11px] text-zinc-400">seats</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeatCount((prev) => Math.min(maxSelectableSeats, prev + 1))}
                    disabled={seatCount >= maxSelectableSeats}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/35 bg-primary/20 text-lg text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)] transition hover:-translate-y-0.5 hover:bg-primary/30 disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/12 bg-white/4.5 px-3 py-2">
                <p className="text-xs text-zinc-400">Booking Amount</p>
                <p className="font-headline text-2xl text-primary">Rs. {formatCurrency(totalAmount)}</p>
              </div>

              {bookingError && (
                <div className="mt-3 rounded-2xl border border-alert-red/30 bg-alert-red/15 p-3 text-sm text-red-200">
                  {bookingError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void onBook()}
                disabled={isSaving || maxSelectableSeats < 1}
                className="btn-premium btn-primary mt-4 w-full px-4 py-3 font-headline text-sm font-bold tracking-[0.2em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Booking..." : "Book Seats"}
              </button>

              {(bookingByVenue[selectedVenue.id] ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => void onCancelBooking()}
                  disabled={isCancelling}
                  className="btn-premium mt-3 w-full rounded-2xl border border-white/15 bg-white/8 px-4 py-3 font-headline text-sm font-bold tracking-[0.14em] text-zinc-100 uppercase backdrop-blur-md transition hover:bg-white/14 disabled:opacity-60"
                >
                  {isCancelling ? "Cancelling..." : "Cancel Existing Booking"}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
