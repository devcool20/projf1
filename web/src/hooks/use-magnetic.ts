"use client";

import type { MouseEvent } from "react";
import { useState } from "react";

type MagneticStyle = {
  transform: string;
};

const IDLE: MagneticStyle = { transform: "translate3d(0, 0, 0)" };

export function useMagnetic(range = 18, strength = 0.22) {
  const [style, setStyle] = useState<MagneticStyle>(IDLE);

  const onMouseMove = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);

    if (distance > range * 3) {
      setStyle(IDLE);
      return;
    }

    const pullX = Math.max(-range, Math.min(range, dx * strength));
    const pullY = Math.max(-range, Math.min(range, dy * strength));
    setStyle({ transform: `translate3d(${pullX}px, ${pullY}px, 0)` });
  };

  const onMouseLeave = () => setStyle(IDLE);

  return { style, onMouseMove, onMouseLeave };
}
