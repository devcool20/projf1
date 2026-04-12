"use client";

import { PageTransition } from "@/components/motion/page-transition";
import { PropsWithChildren } from "react";
import { PaddockBottomNav } from "./paddock-bottom-nav";

export function PaddockShell({ children }: PropsWithChildren) {
  return (
    <div className="relative h-screen overflow-hidden bg-surface text-on-surface">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary/8 blur-[72px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-secondary/8 blur-[80px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-tertiary/8 blur-[80px]" />
      </div>
      <div className="grid h-screen grid-cols-12 px-3 pt-3">
        <main
          className="thin-scrollbar col-span-12 h-full overflow-y-auto rounded-[24px] bg-transparent px-2 pb-28 pt-2 xl:col-span-12 [transform:translateZ(0)]"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <PaddockBottomNav />
    </div>
  );
}
