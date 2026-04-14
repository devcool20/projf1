"use client";

/**
 * macOS-style magnifying dock (Aceternity-style).
 * Pointer-driven magnification using viewport coordinates (clientX).
 */

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";

export type FloatingDockItem = {
  title: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
};

/** Slightly tighter springs on the tray, softer on the glyph for a liquid feel */
const springTray = { mass: 0.15, stiffness: 400, damping: 30 };
const springIcon = { mass: 0.12, stiffness: 480, damping: 34 };

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  active,
}: {
  mouseX: MotionValue<number>;
  title: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const el = ref.current;
    if (!el || val === Infinity) return 800;
    const bounds = el.getBoundingClientRect();
    return val - bounds.left - bounds.width / 2;
  });

  const wSync = useTransform(distance, [-180, 0, 180], [52, 90, 52]);
  const hSync = useTransform(distance, [-180, 0, 180], [52, 90, 52]);
  const iwSync = useTransform(distance, [-180, 0, 180], [24, 40, 24]);
  const ihSync = useTransform(distance, [-180, 0, 180], [24, 40, 24]);

  const width = useSpring(wSync, springTray);
  const height = useSpring(hSync, springTray);
  const iconW = useSpring(iwSync, springIcon);
  const iconH = useSpring(ihSync, springIcon);

  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      className="relative flex shrink-0 items-end"
      aria-current={active ? "page" : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <motion.div
        ref={ref}
        style={{ width, height }}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-full border transition-colors duration-200",
          active
            ? "border-primary/40 bg-primary/14 text-primary shadow-[0_0_0_1px_rgba(124,58,237,0.1)]"
            : "border-slate-200/90 bg-slate-100/95 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-800",
        )}
      >
        {active && (
          <motion.span
            layoutId="floating-dock-active-bg"
            transition={springTray}
            className="absolute inset-0 rounded-full bg-primary/10"
          />
        )}
        <AnimatePresence mode="popLayout">
          {hovered && (
            <motion.span
              initial={{ opacity: 0, y: 8, scale: 0.92, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 5, scale: 0.96, filter: "blur(2px)" }}
              transition={{ type: "spring", stiffness: 540, damping: 36 }}
              className="pointer-events-none absolute -top-[2.35rem] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200/90 bg-white/95 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-slate-700 shadow-lg backdrop-blur-md"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          style={{ width: iconW, height: iconH }}
          className={cn(
            "relative z-10 flex items-center justify-center [&_svg]:h-full [&_svg]:w-full",
            active && "text-primary",
          )}
        >
          {icon}
        </motion.span>
      </motion.div>
    </Link>
  );
}

export function FloatingDock({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: FloatingDockItem[];
  desktopClassName?: string;
  /** Kept for API compatibility with Aceternity demo; merged into the bar on small screens */
  mobileClassName?: string;
}) {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onPointerMove={(e) => mouseX.set(e.clientX)}
      onPointerLeave={() => mouseX.set(Infinity)}
      onPointerCancel={() => mouseX.set(Infinity)}
      className={cn(
        "mx-auto flex h-16 w-fit w-full max-w-[calc(100vw-2rem)] md:max-w-3xl items-center justify-between overflow-visible rounded-2xl border border-slate-200/90 bg-white/92 px-4 shadow-[0_12px_28px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:h-20 sm:rounded-3xl sm:px-8",
        desktopClassName,
        mobileClassName,
      )}
    >
      {items.map((item) => (
        <IconContainer key={item.href} mouseX={mouseX} {...item} />
      ))}
    </motion.div>
  );
}
