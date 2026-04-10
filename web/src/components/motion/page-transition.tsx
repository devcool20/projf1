"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

export function PageTransition({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20, scale: 0.985, x: 18 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
        exit={{ opacity: 0, y: -8, scale: 0.99, x: -18 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
