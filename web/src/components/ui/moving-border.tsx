"use client";

import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

export function MovingBorder({
  children,
  duration = 3000,
  rx = "22%",
  ry = "22%",
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
}) {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue(0);

  useAnimationFrame((time) => {
    const el = pathRef.current;
    if (!el) return;
    const length = el.getTotalLength();
    if (!length) return;
    const pxPerMillisecond = length / duration;
    progress.set((time * pxPerMillisecond) % length);
  });

  const x = useTransform(progress, (val) => {
    const el = pathRef.current;
    return el ? el.getPointAtLength(val).x : 0;
  });
  const y = useTransform(progress, (val) => {
    const el = pathRef.current;
    return el ? el.getPointAtLength(val).y : 0;
  });

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateX(-50%) translateY(-50%)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
        width="100%"
        height="100%"
      >
        <rect fill="none" width="100%" height="100%" rx={rx} ry={ry} ref={pathRef} />
      </svg>
      <motion.div
        className="pointer-events-none absolute left-0 top-0 inline-block"
        style={{ transform }}
      >
        {children}
      </motion.div>
    </>
  );
}

/** Aceternity-style wrapper: animated highlight travels the outer edge. */
export function MovingBorderButton({
  borderRadius = "1.75rem",
  children,
  as: Component = "div",
  containerClassName,
  borderClassName,
  duration = 4000,
  className,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  as?: React.ElementType;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
} & Record<string, unknown>) {
  return (
    <Component
      className={cn(
        "relative w-full overflow-hidden bg-transparent p-[2px]",
        containerClassName,
      )}
      style={{ borderRadius }}
      {...otherProps}
    >
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius }}>
        <MovingBorder duration={duration} rx="22%" ry="22%">
          <div
            className={cn(
              "h-28 w-28 bg-[radial-gradient(circle_at_center,rgb(167,139,250)_0%,rgb(34,211,238)_38%,rgb(244,114,182)_58%,transparent_72%)] opacity-[0.88]",
              borderClassName,
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn("relative z-10 w-full min-h-0", className)}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}
