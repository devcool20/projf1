"use client";

import { navItems } from "@/lib/mock-data";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";

export function PaddockBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-2 z-[90] px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto mx-auto w-full max-w-[780px] rounded-full border border-slate-300 bg-white/95 p-1 shadow-[0_14px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl">
        <div className="grid grid-cols-7 items-center gap-1 px-0.5">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative"
              >
                <motion.span
                  whileHover={{ y: -1, scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative z-10 flex items-center justify-center gap-1 rounded-full px-1 py-1.5 text-[10px] font-medium ${
                    isActive ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  <NavIcon icon={item.icon} className={`h-3 w-3 ${isActive ? "text-primary" : "text-slate-500"}`} />
                  <span className="hidden truncate sm:inline">{item.label}</span>
                </motion.span>
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      layoutId="paddock-bottom-active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-slate-100 ring-1 ring-slate-200/90"
                    />
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
