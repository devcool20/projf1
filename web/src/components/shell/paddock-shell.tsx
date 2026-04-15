"use client";

import { SharedLayout } from "@/components/motion/page-transition";
import { PropsWithChildren } from "react";
import { PaddockBottomNav } from "./paddock-bottom-nav";

export function PaddockShell({ children }: PropsWithChildren) {
  return (
    <div className="relative h-screen overflow-x-hidden overflow-y-hidden bg-white text-on-surface">
      <div className="grid h-screen grid-cols-12 px-2 pt-3 sm:px-3">
        <main
          className="premium-scrollbar col-span-12 h-full overflow-x-hidden overflow-y-auto rounded-[24px] bg-transparent px-1 pb-36 pt-2 sm:px-2 xl:col-span-12 transform-[translateZ(0)]"
          id="paddock-main"
        >
          <SharedLayout itemId="paddock-shell">
            {children}
          </SharedLayout>
        </main>
      </div>
      <PaddockBottomNav />
    </div>
  );
}