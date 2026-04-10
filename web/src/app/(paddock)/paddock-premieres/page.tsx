"use client";

import { screeningEvents as seededEvents } from "@/lib/mock-data";
import { ScreeningEvent } from "@/lib/types";
import { CalendarDays, MapPin, Ticket, UtensilsCrossed } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";

const cityPositions: Record<string, { x: string; y: string }> = {
  Mumbai: { x: "36%", y: "58%" },
  Bengaluru: { x: "44%", y: "70%" },
  Delhi: { x: "40%", y: "38%" },
  Pune: { x: "34%", y: "64%" },
};

export default function PaddockPremieresPage() {
  const [events, setEvents] = useState<ScreeningEvent[]>(seededEvents);
  const [selectedId, setSelectedId] = useState(seededEvents[0]?.id ?? "");
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedId) ?? events[0],
    [events, selectedId],
  );

  const onBook = () => {
    if (!selectedEvent) return;
    if (bookedIds.has(selectedEvent.id)) return;
    if (selectedEvent.bookedSeats >= selectedEvent.totalSeats) return;

    setEvents((prev) =>
      prev.map((event) =>
        event.id === selectedEvent.id ? { ...event, bookedSeats: event.bookedSeats + 1 } : event,
      ),
    );

    setBookedIds((prev) => {
      const next = new Set(prev);
      next.add(selectedEvent.id);
      return next;
    });
  };

  return (
    <div className="grid grid-cols-12 gap-4 pb-20">
      <section className="col-span-12 xl:col-span-7">
        <div className="mb-4 border-b border-primary/20 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
            Paddock Premieres
          </p>
          <h2 className="font-headline text-3xl font-bold">Upcoming Race Screening Nights</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Choose a city screening, open details, and reserve your seat before the grid fills up.
          </p>
        </div>

        <div className="space-y-3">
          {events.map((event) => {
            const selected = selectedId === event.id;
            const seatsLeft = Math.max(event.totalSeats - event.bookedSeats, 0);

            return (
              <button
                key={event.id}
                onClick={() => setSelectedId(event.id)}
                className={`dashboard-panel w-full p-4 text-left transition hover:scale-[1.01] ${
                  selected ? "border-secondary/60 shadow-[0_0_16px_rgba(126,246,238,0.2)]" : "border-outline-variant/25"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-headline text-lg">{event.title}</p>
                    <p className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                      Entry Fee
                    </p>
                    <p className="font-headline text-lg text-primary">Rs. {event.entryFee}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {event.dateLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Ticket className="h-3.5 w-3.5" />
                    {seatsLeft} seats left
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="col-span-12 xl:col-span-5">
        {!selectedEvent ? (
          <div className="dashboard-panel p-4">
            <p className="font-headline text-xl">No screening selected</p>
          </div>
        ) : (
          <motion.div
            key={selectedEvent.id}
            initial={{ opacity: 0.6, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="dashboard-panel p-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Screening Detail
            </p>
            <h3 className="mt-2 font-headline text-2xl font-bold">{selectedEvent.title}</h3>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-on-surface-variant">
              {selectedEvent.city} {"//"} {selectedEvent.dateLabel}
            </p>

            <div className="mt-4 grid gap-2">
              <div className="border border-outline-variant/25 bg-surface-container-low p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Address</p>
                <p className="mt-1 text-sm">{selectedEvent.address}</p>
              </div>
              <div className="border border-outline-variant/25 bg-surface-container-low p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Venue</p>
                <p className="mt-1 text-sm">{selectedEvent.venue}</p>
              </div>
              <div className="border border-outline-variant/25 bg-surface-container-low p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Organiser</p>
                <p className="mt-1 text-sm">{selectedEvent.organiser}</p>
              </div>
              <div className="border border-outline-variant/25 bg-surface-container-low p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Entry Fee</p>
                <p className="mt-1 text-sm">Rs. {selectedEvent.entryFee}</p>
              </div>
            </div>

            <div className="mt-4 border border-outline-variant/25 bg-surface-container-low p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">What to Expect</p>
              <p className="mt-2 text-sm text-on-surface-variant">{selectedEvent.details}</p>
            </div>

            <div className="mt-4 border border-outline-variant/25 bg-surface-container-low p-3">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Food and Drink Options
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedEvent.foodAndDrinks.map((item) => (
                  <span key={item} className="border border-outline-variant/25 px-2 py-1 text-xs text-on-surface-variant">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={onBook}
              disabled={bookedIds.has(selectedEvent.id) || selectedEvent.bookedSeats >= selectedEvent.totalSeats}
              className="mt-5 w-full bg-primary px-4 py-3 font-headline text-sm font-bold tracking-[0.2em] text-white uppercase disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant"
            >
              {bookedIds.has(selectedEvent.id) ? "Place Booked" : "Book a Place"}
            </button>
          </motion.div>
        )}
      </aside>

      <section className="col-span-12">
        <div className="dashboard-panel relative h-52 sm:h-64 overflow-hidden rounded-[20px] border border-outline-variant/40 bg-[linear-gradient(140deg,rgba(124,58,237,0.14),rgba(0,229,255,0.12),rgba(255,77,109,0.1))] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">Event Map</p>
          <div className="relative mt-2 h-[calc(100%-1.6rem)] rounded-[16px] border border-outline-variant/40 bg-surface-container">
            {events.map((event) => {
              const pos = cityPositions[event.city] ?? { x: "50%", y: "50%" };
              const selected = selectedId === event.id;
              return (
                <button
                  key={`pin-${event.id}`}
                  onClick={() => setSelectedId(event.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: pos.x, top: pos.y }}
                >
                  <span className={`relative flex h-3.5 w-3.5 items-center justify-center rounded-full ${selected ? "bg-secondary" : "bg-primary"}`}>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
