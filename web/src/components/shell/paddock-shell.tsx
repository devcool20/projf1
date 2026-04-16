"use client";

import { SharedLayout } from "@/components/motion/page-transition";
import { PropsWithChildren, useEffect } from "react";
import { usePathname } from "next/navigation";
import { PaddockBottomNav } from "./paddock-bottom-nav";

export function PaddockShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isParcFerme = pathname?.includes("/parc-ferme") ?? false;

  useEffect(() => {
    if (!isParcFerme) return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("parc-ferme-route");
    body.classList.add("parc-ferme-route");
    return () => {
      root.classList.remove("parc-ferme-route");
      body.classList.remove("parc-ferme-route");
    };
  }, [isParcFerme]);

  return (
    <div
      className={
        isParcFerme
          ? "relative h-screen w-full min-w-0 max-w-full overflow-x-hidden overflow-y-hidden bg-[#02050c] text-on-surface"
          : "relative h-screen overflow-x-hidden overflow-y-hidden bg-white text-on-surface"
      }
    >
      <div
        className={
          isParcFerme
            ? "grid h-screen grid-cols-12 bg-[#02050c] px-0 pt-0"
            : "grid h-screen grid-cols-12 px-2 pt-3 sm:px-3"
        }
      >
        <main
          className={
            isParcFerme
              ? "col-span-12 h-full overflow-x-hidden overflow-y-hidden bg-[#02050c] px-0 pb-32 pt-0 xl:col-span-12 transform-[translateZ(0)]"
              : "premium-scrollbar col-span-12 h-full overflow-x-hidden overflow-y-auto rounded-[24px] bg-transparent px-1 pb-36 pt-2 sm:px-2 xl:col-span-12 transform-[translateZ(0)]"
          }
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