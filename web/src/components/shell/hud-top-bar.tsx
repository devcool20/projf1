"use client";

import { Bell, Search, Settings } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { TelemetryTicker } from "./telemetry-ticker";

export function HudTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (query.trim()) {
      router.push(`${pathname}?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(pathname);
    }
  };

  return (
    <header className="glass-panel fixed inset-x-0 left-20 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant/20 px-5">
      <div className="flex items-center">
        <TelemetryTicker />
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={onSubmit} className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-on-surface-variant" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="FREQUENCY SEARCH..."
            className="hud-input w-64 py-2 pl-8 pr-3 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface outline-none focus:border-secondary"
          />
        </form>
        <button className="rounded-sm border border-transparent p-2 text-on-surface-variant hover:border-secondary/30 hover:text-secondary">
          <Bell className="h-4 w-4" />
        </button>
        <button className="rounded-sm border border-transparent p-2 text-on-surface-variant hover:border-secondary/30 hover:text-secondary">
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
