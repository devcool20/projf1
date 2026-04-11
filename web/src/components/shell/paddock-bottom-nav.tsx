"use client";

import { navItems } from "@/lib/mock-data";
import { FloatingDock } from "@/components/ui/floating-dock";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";

export function PaddockBottomNav() {
  const pathname = usePathname();

  const items = navItems.map((item) => {
    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return {
      title: item.label,
      href: item.href,
      active: isActive,
      icon: (
        <NavIcon
          icon={item.icon}
          className={isActive ? "text-primary" : "text-slate-500"}
        />
      ),
    };
  });

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-2 z-[90] flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
      <div className="pointer-events-auto w-fit max-w-full">
        <FloatingDock items={items} />
      </div>
    </nav>
  );
}
