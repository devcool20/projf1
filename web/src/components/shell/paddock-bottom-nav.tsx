"use client";

import { navItems } from "@/lib/mock-data";
import { FloatingDock } from "@/components/ui/floating-dock";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";

export function PaddockBottomNav() {
  const pathname = usePathname();
  const isParcFerme = pathname?.includes("/parc-ferme") ?? false;

  const items = navItems.map((item) => {
    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return {
      title: item.label,
      href: item.href,
      active: isActive,
      icon: (
        <NavIcon
          icon={item.icon}
          className={isActive ? "text-primary" : isParcFerme ? "text-slate-400" : "text-slate-500"}
        />
      ),
    };
  });

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-2 z-90 flex justify-center px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:px-3">
      <div className="pointer-events-auto w-fit max-w-full">
        <FloatingDock items={items} variant={isParcFerme ? "dark" : "default"} />
      </div>
    </nav>
  );
}
