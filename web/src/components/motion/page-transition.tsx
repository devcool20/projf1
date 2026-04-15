"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { iosSpring, listContainerVariants, listItemVariants } from "./premium-motion";
import { sharedElement } from "./shared-motion";

interface TransitionContextValue {
  itemId?: string;
  isInitial?: boolean;
}

const TransitionContext = createContext<TransitionContextValue>({});

export function useTransitionItem(id?: string, isInitial = false) {
  return useContext(TransitionContext) || { itemId: id, isInitial };
}

/**
 * Shared Layout Wrapper — must be an immediate parent of pages that participate
 * in shared element transitions. It provides layoutId scope and stagger containers.
 */
export function SharedLayout({ children, itemId }: PropsWithChildren<{ itemId?: string }>) {
  return (
    <TransitionContext.Provider value={{ itemId, isInitial: false }}>
      <motion.div
        layout
        className="h-full w-full"
        initial={false}
        animate={true}
        {...sharedElement(itemId)}
      >
        {children}
      </motion.div>
    </TransitionContext.Provider>
  );
}

/**
 * PageTransition with spring physics, staggered list entrances, and shared element support.
 * Usage: wrap pages inside SharedLayout (or wrap root in production).
 */
export function PageTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { itemId, isInitial } = useContext(TransitionContext) || {};

  const commonTransition = {
    type: "spring" as const,
    stiffness: 400,
    damping: 35,
    mass: 0.6,
  };

  const containerVariants = useMemo(
    () => ({
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0, transition: commonTransition },
      exit: { opacity: 0, y: -8, transition: commonTransition },
    }),
    []
  );

  return (
    <AnimatePresence mode="popLayout" initial={isInitial}>
      <motion.div
        key={pathname}
        className="h-full w-full"
        variants={containerVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={commonTransition}
        layout
      >
        {/* Staggered container for lists/grids on the page */}
        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="h-full w-full"
        >
          <motion.div variants={listItemVariants} {...sharedElement(itemId)}>
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}