"use client";

import { navItems } from "@/lib/mock-data";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon } from "./nav-icon";

export function PitWallDock() {
  const pathname = usePathname();

  return (
    <aside className="group fixed inset-y-0 left-0 z-50 flex w-20 flex-col overflow-hidden border-r border-secondary/20 bg-black/95 shadow-[0_0_18px_rgba(126,246,238,0.12)] transition-all duration-300 hover:w-64">
      <div className="p-3">
        <p className="font-headline text-lg font-bold italic tracking-tight text-primary whitespace-nowrap">
          projf1
        </p>
        <p className="mt-1 font-mono text-[10px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
          ID: #44-VER-2024
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-3 text-sm hover:bg-white/5 ${
                isActive
                  ? "border-l-2 border-secondary bg-gradient-to-r from-secondary/10 text-secondary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <NavIcon icon={item.icon} className="h-4 w-4 shrink-0" />
              <span className="font-headline opacity-0 transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
