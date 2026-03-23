"use client";

import { PageTransition } from "@/components/motion/page-transition";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";
import { ContextSidebar } from "./context-sidebar";
import { HudTopBar } from "./hud-top-bar";
import { PitWallDock } from "./pit-wall-dock";

export function PaddockShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const hideGlobalContext =
    pathname.startsWith("/comms") ||
    pathname.startsWith("/predictions") ||
    pathname.startsWith("/telemetry") ||
    pathname.startsWith("/paddock-premieres") ||
    pathname.startsWith("/strategy");

  return (
    <div className="h-screen overflow-hidden bg-surface-dim text-on-surface">
      <PitWallDock />
      <HudTopBar />
      <div className="ml-20 mt-16 grid h-[calc(100vh-4rem)] grid-cols-12">
        <main
          className={`thin-scrollbar col-span-12 h-full overflow-y-auto bg-surface-dim p-6 ${
            hideGlobalContext ? "xl:col-span-12" : "xl:col-span-9"
          }`}
        >
          <PageTransition>{children}</PageTransition>
        </main>
        {!hideGlobalContext && (
          <div className="xl:col-span-3">
            <ContextSidebar />
          </div>
        )}
      </div>
    </div>
  );
}
