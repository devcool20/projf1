"use client";

import { screeningEvents as seededEvents } from "@/lib/mock-data";
import { ScreeningEvent } from "@/lib/types";
import { CalendarDays, MapPin, Ticket, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";

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
    <div className="grid grid-cols-12 gap-4">
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
          <div className="dashboard-panel p-4">
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
              className="mt-5 w-full bg-primary px-4 py-3 font-headline text-sm font-bold tracking-[0.2em] text-black uppercase disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant"
            >
              {bookedIds.has(selectedEvent.id) ? "Place Booked" : "Book a Place"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
