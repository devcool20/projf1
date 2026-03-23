"use client";

import { PageTransition } from "@/components/motion/page-transition";
import { PropsWithChildren } from "react";
import { HudTopBar } from "./hud-top-bar";
import { PitWallDock } from "./pit-wall-dock";

export function PaddockShell({ children }: PropsWithChildren) {
  return (
    <div className="h-screen overflow-hidden bg-surface-dim text-on-surface">
      <PitWallDock />
      <HudTopBar />
      <div className="ml-20 mt-16 grid h-[calc(100vh-4rem)] grid-cols-12">
        <main
          className="thin-scrollbar col-span-12 h-full overflow-y-auto bg-surface-dim p-6 xl:col-span-12"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
