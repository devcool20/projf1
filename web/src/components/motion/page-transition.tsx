"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { fastFade, routeVariants } from "./premium-motion";

export function PageTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        className="h-full"
        variants={routeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={fastFade}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
