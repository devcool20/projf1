"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CollectibleCard, ParcFermeCard } from "./collectible-card";

const STEP_PX = 108;
const MAX_ROTATE_Y = 25;
const OPACITY_FLOOR = 0.4;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type CardRailProps = {
  cards: ParcFermeCard[];
  onSelectCard: (card: ParcFermeCard) => void;
};

export function CardRail({ cards, onSelectCard }: CardRailProps) {
  const n = cards.length;
  const initial = useMemo(() => (n <= 0 ? 0 : Math.floor((n - 1) / 2)), [n]);

  const [activeIndex, setActiveIndex] = useState(initial);
  const activeIndexRef = useRef(activeIndex);
  useLayoutEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startIndex: number } | null>(null);
  const wheelSnapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  /** Batch drag updates to one React commit per frame (critical for mobile). */
  const dragRafRef = useRef<number | null>(null);
  const pendingIndexRef = useRef(initial);

  const cardsWithTransforms = useMemo(() => {
    return cards.map((card, idx) => {
      const rel = idx - activeIndex;
      const ax = rel * STEP_PX;
      const rotateY = clamp(-rel * 14, -MAX_ROTATE_Y, MAX_ROTATE_Y);
      const scale = Math.max(0.72, 1.1 - Math.min(Math.abs(rel), 5) * 0.068);
      const opacity = OPACITY_FLOOR + (1 - OPACITY_FLOOR) * (1 - Math.min(Math.abs(rel) / 4.5, 1));
      const y = Math.abs(rel) * 6;
      const zIndex = Math.max(1, 80 - Math.round(Math.abs(rel) * 12));
      const rounded = Math.round(activeIndex);
      const isCenter = n > 0 && idx === rounded;
      return { card, ax, y, rotateY, scale, opacity, zIndex, isCenter };
    });
  }, [cards, activeIndex, n]);

  const cancelDragRaf = useCallback(() => {
    if (dragRafRef.current != null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
  }, []);

  const scheduleIndexFromDrag = useCallback(
    (next: number) => {
      pendingIndexRef.current = next;
      if (dragRafRef.current != null) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        setActiveIndex(pendingIndexRef.current);
      });
    },
    []
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startIndex: activeIndexRef.current,
    };
    pendingIndexRef.current = activeIndexRef.current;
    setIsDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const deltaIndex = -dx / STEP_PX;
      const next = clamp(dragRef.current.startIndex + deltaIndex, 0, Math.max(0, n - 1));
      scheduleIndexFromDrag(next);
    },
    [n, scheduleIndexFromDrag]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = dragRef.current;
      dragRef.current = null;
      cancelDragRaf();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setIsDragging(false);

      const snapped = Math.round(clamp(pendingIndexRef.current, 0, Math.max(0, n - 1)));
      setActiveIndex(snapped);

      if (start && n > 0) {
        const dist = Math.hypot(e.clientX - start.startX, e.clientY - start.startY);
        if (dist < 10) {
          onSelectCard(cards[snapped]);
        }
      }
    },
    [cancelDragRaf, cards, n, onSelectCard]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = null;
      cancelDragRaf();
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      setIsDragging(false);
      setActiveIndex((i) => Math.round(clamp(i, 0, Math.max(0, n - 1))));
    },
    [cancelDragRaf, n]
  );

  const wheelHandler = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (n <= 1) return;

      if (wheelSnapTimer.current) clearTimeout(wheelSnapTimer.current);

      const delta = e.deltaY > 0 ? 0.11 : -0.11;
      setActiveIndex((i) => clamp(i + delta, 0, n - 1));

      wheelSnapTimer.current = setTimeout(() => {
        setActiveIndex((i) => Math.round(clamp(i, 0, n - 1)));
      }, 140);
    },
    [n]
  );

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler);
  }, [wheelHandler]);

  const transition = isDragging
    ? { duration: 0 }
    : { type: "tween" as const, duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const };

  return (
    <div
      ref={railRef}
      className="parc-rail parc-rail-perspective relative w-full max-w-[min(1300px,100%)] touch-none select-none overflow-visible"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{ perspective: 1200, perspectiveOrigin: "50% 100%" }}
    >
      <div className="relative mx-auto h-[min(300px,42dvh)] w-full cursor-grab active:cursor-grabbing">
        {cardsWithTransforms.map(({ card, ax, y, rotateY, scale, opacity, zIndex, isCenter }) => (
          <motion.div
            key={card.id}
            className="absolute left-1/2 will-change-transform"
            style={{
              zIndex,
              transformStyle: "preserve-3d",
              transformOrigin: "bottom center",
              top: 0,
              marginLeft: "-91px",
            }}
            animate={{
              x: ax,
              y,
              rotateY,
              scale,
              opacity,
            }}
            transition={transition}
          >
            <CollectibleCard card={card} isCenter={isCenter} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
