"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DashboardMissionSplash } from "./dashboard-mission-splash";

/**
 * Full-screen mission splash on every visit to the dashboard (`/`).
 * Resets when navigating away so returning to home runs the sequence again.
 */
export function DashboardSplashGate({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;

    if (pathname !== "/") {
      setDismissed(false);
      prevPathRef.current = pathname;
      return;
    }

    const firstLoad = prev === null;
    const enteredFromElsewhere = prev !== null && prev !== "/";
    if (firstLoad || enteredFromElsewhere) {
      setRunKey((k) => k + 1);
      setDismissed(false);
    }
    prevPathRef.current = pathname;
  }, [pathname]);

  const showSplash = pathname === "/" && !dismissed;

  const handleComplete = useCallback(() => {
    setDismissed(true);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const body = document.body;
    if (showSplash) {
      root.classList.add("dashboard-splash-active");
      body.classList.add("dashboard-splash-active");
      return () => {
        root.classList.remove("dashboard-splash-active");
        body.classList.remove("dashboard-splash-active");
      };
    }
    root.classList.remove("dashboard-splash-active");
    body.classList.remove("dashboard-splash-active");
  }, [mounted, showSplash]);

  return (
    <>
      {mounted
        ? createPortal(
            <AnimatePresence mode="wait">
              {showSplash ? (
                <DashboardMissionSplash key={runKey} runKey={runKey} onComplete={handleComplete} />
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
      {children}
    </>
  );
}
