"use client";

import { navItems } from "@/lib/mock-data";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMagnetic } from "@/hooks/use-magnetic";
import { NavIcon } from "./nav-icon";

function DockLink({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: string;
  label: string;
  isActive: boolean;
}) {
  const magnetic = useMagnetic(12, 0.18);

  return (
    <Link
      href={href}
      {...magnetic}
      className={`haptic-pill flex items-center gap-4 px-3 py-3 text-sm hover:bg-white/8 ${
        isActive
          ? "team-accent-border border bg-gradient-to-r from-white/12 to-transparent team-accent-text"
          : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      <NavIcon icon={icon} className="h-4 w-4 shrink-0" />
      <span className="font-headline opacity-0 transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </Link>
  );
}

export function PitWallDock() {
  const pathname = usePathname();
  const logoMagnet = useMagnetic();

  return (
    <aside className="group fixed inset-y-4 left-3 z-50 flex w-20 flex-col overflow-hidden rounded-[32px] border border-white/15 bg-white/5 shadow-[0_20px_55px_rgba(2,6,23,0.45)] backdrop-blur-xl transition-all duration-300 hover:w-64">
      <div className="p-3">
        <Link href="/" className="block haptic-pill" {...logoMagnet}>
          <video
            src="/f1logo.mp4"
            className="h-8 w-14 object-contain"
            autoPlay
            loop
            muted
            playsInline
          />
        </Link>
        <p className="mt-1 font-mono text-[10px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100">
          ID: #44-VER-2024
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <DockLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={isActive}
            />
          );
        })}
      </nav>
    </aside>
  );
}
