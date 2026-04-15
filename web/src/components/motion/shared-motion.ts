"use client";

import type { MotionProps, Variants } from "framer-motion";

/** --- Spring Physics Presets --- */

/** Premium spring with natural weight & snap */
export const premiumSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 35,
  mass: 0.6,
};

/** Gentle spring for background/content entrances */
export const gentleSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 35,
  mass: 0.5,
};

/** Quick, responsive tap feedback */
export const snapSpring = {
  type: "spring" as const,
  stiffness: 600,
  damping: 40,
  mass: 0.4,
};

/** --- Staggered Container Variants --- */

/** Vertical stagger: children cascade in */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/** Horizontal waterfall stagger */
export const staggerWaterfall: Variants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
      type: "spring",
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

/** Grid card stagger with scale lift */
export const staggerGrid: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
      type: "spring",
      stiffness: 350,
    },
  },
  exit: {
    opacity: 0,
    y: 30,
    scale: 0.95,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

/** --- Shared Element Transition Variants --- */

/** Map/hero card -> detail page morph */
export const morphSharedVariants: Variants = {
  initial: {
    opacity: 1,
    scale: 1,
    transition: { ...premiumSpring },
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { ...premiumSpring },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { ...premiumSpring },
  },
};

/** Detail page <- map/hero shared element return */
export const morphDetailSharedVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    transition: { ...premiumSpring, delay: 0.1 },
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { ...premiumSpring },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { ...premiumSpring },
  },
};

/** --- Utility Motion Props --- */

/** Apply shared element transition props */
export const sharedElement = (_id?: string): MotionProps => ({
  transition: { ...premiumSpring },
  layout: true,
  // Note: Framer Motion handles layoutId-based shared elements via layout props
});

/** Common card hover/press lift */
export const cardLift: MotionProps = {
  whileHover: {
    scale: 1.02,
    transition: { ...snapSpring },
  },
  whileTap: {
    scale: 0.98,
    transition: { ...snapSpring },
  },
};

/** Panel slide-in from right (modal style) */
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 },
};

/** Panel slide-in from bottom (mobile sheet) */
export const slideInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
};