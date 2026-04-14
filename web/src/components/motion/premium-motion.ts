"use client";

import type { Transition, Variants } from "framer-motion";

/**
 * Premium Motion System
 * Provides smooth, crisp animations for screens, modals, and cards.
 */

/** Snappy spring for interactive elements (buttons, modals, cards) */
export const iosSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.5,
};

/** Shared smooth fade using spring (replaces standard tweens) */
export const fastFade: Transition = { ...iosSpring };

/** Modal enter/exit spring */
export const modalSpring: Transition = { ...iosSpring };

/** Route-level screen opening animation */
export const routeVariants: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: iosSpring },
  exit: { opacity: 0, y: -10, transition: iosSpring },
};

/** Container for lists — staggers card loading */
export const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/** Individual card loading items — slide up slightly as they fade in */
export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: iosSpring },
};

/** Skeleton pulse while loading */
export const skeletonPulse: Variants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/** Modal overlay variants */
export const overlayVariants: Variants = {
  initial: { opacity: 0, backdropFilter: "blur(0px)" },
  animate: { opacity: 1, backdropFilter: "blur(4px)", transition: iosSpring },
  exit: { opacity: 0, backdropFilter: "blur(0px)", transition: iosSpring },
};

/** Modal opening animation — Slide & Fade */
export const modalPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 10 },
};
