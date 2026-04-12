"use client";

import type { Transition, Variants } from "framer-motion";

/**
 * Unified motion system — iOS-style quick fade everywhere.
 * No stagger, no scale, no y-translate on routes = zero perceived lag.
 */

/** Snappy spring for interactive elements (buttons, modals, cards) */
export const iosSpring: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

/** Fast opacity-only tween for route/page transitions */
export const fastFade: Transition = {
  duration: 0.15,
  ease: "easeOut",
};

/** Modal enter/exit spring — quick pop with no overshoot */
export const modalSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 38,
  mass: 0.72,
};

/** Route-level variants — opacity only, no layout shift */
export const routeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Container for lists — no stagger, children appear instantly */
export const listContainerVariants: Variants = {
  hidden: {},
  show: {},
};

/** Individual list items — just fade in, no y-translate */
export const listItemVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: fastFade },
};

/** Skeleton pulse while loading */
export const skeletonPulse: Variants = {
  initial: { opacity: 0.55 },
  animate: {
    opacity: [0.55, 0.8, 0.55],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/** Modal overlay variants */
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Modal panel variants — subtle scale pop */
export const modalPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
};
