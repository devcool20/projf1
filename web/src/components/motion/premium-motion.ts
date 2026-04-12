"use client";

import type { Transition, Variants } from "framer-motion";

export const iosSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export const routeVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 1.015 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.985 },
};

export const listContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: iosSpring },
};

export const skeletonPulse: Variants = {
  initial: { opacity: 0.58 },
  animate: {
    opacity: [0.58, 0.82, 0.58],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
