"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { UserRound, X } from "lucide-react";
import { ProfileScreen } from "@/components/profile/profile-screen";

type DashboardProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PremiumProfileTrigger({ onPress }: { onPress: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Open Super License profile"
      onClick={onPress}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="btn-premium btn-outline-glass group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/35"
    >
      <UserRound className="h-[19px] w-[19px]" strokeWidth={2.25} aria-hidden />
    </motion.button>
  );
}

function subscribe() {
  return () => {};
}

export function DashboardProfileModal({ open, onClose }: DashboardProfileModalProps) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.button
            type="button"
            aria-label="Close profile"
            className="absolute inset-0 bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-profile-modal-title"
            className="relative flex h-[min(92dvh,920px)] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] border border-slate-200/90 bg-[var(--color-base)] shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.72 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-secondary">Paddock OS</p>
                <h2 id="dashboard-profile-modal-title" className="font-headline text-base font-bold tracking-tight text-slate-900">
                  Super License
                </h2>
              </div>
              <motion.button
                type="button"
                aria-label="Close"
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="btn-premium btn-outline-glass flex h-10 w-10 items-center justify-center rounded-full p-0 text-slate-600"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </motion.button>
            </div>

            <div className="premium-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-4 sm:px-5">
              <ProfileScreen />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
