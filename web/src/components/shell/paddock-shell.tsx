"use client";

import { PageTransition } from "@/components/motion/page-transition";
import { PropsWithChildren } from "react";
import { PaddockBottomNav } from "./paddock-bottom-nav";

export function PaddockShell({ children }: PropsWithChildren) {
  return (
    <div className="relative h-screen overflow-hidden bg-white text-on-surface">
      <div className="grid h-screen grid-cols-12 px-3 pt-3">
        <main
          className="premium-scrollbar col-span-12 h-full overflow-y-auto rounded-[24px] bg-transparent px-2 pb-36 pt-2 xl:col-span-12 [transform:translateZ(0)]"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <PaddockBottomNav />
    </div>
  );
}
