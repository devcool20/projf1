"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren } from "react";
import { fastFade } from "@/components/motion/premium-motion";

/**
 * Main layout with premium entrance/exit animations.
 * Pages should use SharedLayout for shared element transitions.
 */
export function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fastFade}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}