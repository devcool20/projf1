"use client";

import { useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

function spawnBurst(anchor: HTMLElement, color: string, altColor: string, shape: "heart" | "star") {
  const canvas = document.createElement("canvas");
  canvas.width = 80;
  canvas.height = 80;
  Object.assign(canvas.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
    zIndex: "50",
  });
  anchor.style.position = "relative";
  anchor.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const count = shape === "heart" ? 8 : 6;
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const speed = 1.8 + Math.random() * 1.6;
    return {
      x: 40,
      y: 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.8 + Math.random() * 2.2,
      alpha: 1,
      color: Math.random() > 0.5 ? color : altColor,
    };
  });

  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, 80, 80);
    let alive = false;

    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.09;
      particle.alpha -= 0.042;
      if (particle.alpha <= 0) continue;
      alive = true;
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;

      if (shape === "heart") {
        const radius = particle.r;
        ctx.beginPath();
        ctx.arc(particle.x - radius / 2, particle.y - radius / 2, radius, Math.PI, 0);
        ctx.arc(particle.x + radius / 2, particle.y - radius / 2, radius, Math.PI, 0);
        ctx.lineTo(particle.x, particle.y + radius * 1.6);
        ctx.closePath();
        ctx.fill();
      } else {
        const size = particle.r * 1.3;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k * 4 * Math.PI) / 5 - Math.PI / 2;
          const b = ((k * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
          if (k === 0) {
            ctx.moveTo(particle.x + Math.cos(a) * size, particle.y + Math.sin(a) * size);
          } else {
            ctx.lineTo(particle.x + Math.cos(a) * size, particle.y + Math.sin(a) * size);
          }
          ctx.lineTo(particle.x + Math.cos(b) * size * 0.4, particle.y + Math.sin(b) * size * 0.4);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    if (alive && frame++ < 42) requestAnimationFrame(tick);
    else canvas.remove();
  };

  requestAnimationFrame(tick);
}

function spawnRipple(anchor: HTMLElement, color: string) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    borderRadius: "50%",
    background: color,
    width: "0",
    height: "0",
    pointerEvents: "none",
    zIndex: "40",
    animation: "paddock-ripple 0.45s ease-out forwards",
  });
  anchor.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

if (typeof document !== "undefined" && !document.getElementById("paddock-micro-kf")) {
  const style = document.createElement("style");
  style.id = "paddock-micro-kf";
  style.textContent = `
    @keyframes paddock-ripple {
      from { width:0; height:0; opacity:0.55; }
      to   { width:56px; height:56px; opacity:0; }
    }
  `;
  document.head.appendChild(style);
}

interface LikeButtonProps {
  liked: boolean;
  count: number;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function LikeButton({ liked, count, onToggle, disabled, size = "md" }: LikeButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const controls = useAnimation();

  const handleClick = useCallback(async () => {
    if (disabled) return;
    const willLike = !liked;

    await controls.start({
      scale: [1, 0.7, 1.38, 0.92, 1],
      rotate: willLike ? [0, -8, 4, 0] : [0, 0],
      transition: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] },
    });

    if (willLike && btnRef.current) {
      spawnBurst(btnRef.current, "#e11d48", "#fb7185", "heart");
      spawnRipple(btnRef.current, "rgba(225,29,72,0.11)");
    }

    onToggle();
  }, [liked, disabled, controls, onToggle]);

  const iconSize = size === "sm" ? 15 : 17;

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      style={{ position: "relative", overflow: "visible" }}
      className={`inline-flex items-center gap-1.5 rounded-full border-none bg-transparent px-2.5 py-1.5 transition-colors duration-150 hover:bg-black/4 active:bg-black/7 disabled:cursor-not-allowed disabled:opacity-40 ${
        liked ? "text-rose-500" : "text-slate-500"
      }`}
    >
      <motion.svg
        animate={controls}
        viewBox="0 0 24 24"
        fill={liked ? "#e11d48" : "none"}
        stroke={liked ? "#e11d48" : "currentColor"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: iconSize, height: iconSize, display: "block" }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </motion.svg>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ y: liked ? -10 : 10, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: liked ? 10 : -10, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-[13px] font-medium tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

interface BookmarkButtonProps {
  bookmarked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function BookmarkButton({ bookmarked, onToggle, disabled, size = "md" }: BookmarkButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const controls = useAnimation();

  const handleClick = useCallback(async () => {
    if (disabled) return;
    const willBookmark = !bookmarked;

    await controls.start({
      scale: [1, 0.72, 1.35, 0.94, 1],
      rotate: willBookmark ? [0, -14, 7, -2, 0] : [0, 5, 0],
      transition: { duration: 0.42, ease: [0.34, 1.56, 0.64, 1] },
    });

    if (willBookmark && btnRef.current) {
      spawnBurst(btnRef.current, "#7c3aed", "#a78bfa", "star");
      spawnRipple(btnRef.current, "rgba(124,58,237,0.11)");
    }

    onToggle();
  }, [bookmarked, disabled, controls, onToggle]);

  const iconSize = size === "sm" ? 15 : 17;

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      disabled={disabled}
      style={{ position: "relative", overflow: "visible" }}
      className={`inline-flex items-center justify-center rounded-full border-none bg-transparent p-1.5 transition-colors duration-150 hover:bg-black/4 active:bg-black/7 disabled:cursor-not-allowed disabled:opacity-40 ${
        bookmarked ? "text-violet-600" : "text-slate-500"
      }`}
    >
      <motion.svg
        animate={controls}
        viewBox="0 0 24 24"
        fill={bookmarked ? "#7c3aed" : "none"}
        stroke={bookmarked ? "#7c3aed" : "currentColor"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: iconSize, height: iconSize, display: "block" }}
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </motion.svg>
    </button>
  );
}
