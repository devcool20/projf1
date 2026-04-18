"use client";

import { BellIcon, Cog6ToothIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useMagnetic } from "@/hooks/use-magnetic";
import { TelemetryTicker } from "./telemetry-ticker";

export function HudTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const bellMagnet = useMagnetic();
  const settingsMagnet = useMagnetic();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (query.trim()) {
      router.push(`${pathname}?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push(pathname);
    }
  };

  return (
    <header className="fixed left-[5.5rem] right-4 top-3 z-40 flex h-14 items-center justify-between rounded-full border border-white/15 bg-white/5 px-5 backdrop-blur-xl shadow-[0_12px_35px_rgba(2,6,23,0.38)]">
      <div className="flex items-center">
        <TelemetryTicker />
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={onSubmit} className="relative hidden sm:block">
          <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="FREQUENCY SEARCH..."
            className="hud-input w-64 py-2 pl-8 pr-3 font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface outline-none focus:border-tertiary"
          />
        </form>
        <button
          type="button"
          {...bellMagnet}
          className="btn-premium btn-outline-glass rounded-full border-white/10 bg-white/5 p-2 text-on-surface-variant hover:border-tertiary/40 hover:text-tertiary"
        >
          <BellIcon className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          {...settingsMagnet}
          className="btn-premium btn-outline-glass rounded-full border-white/10 bg-white/5 p-2 text-on-surface-variant hover:border-primary/40 hover:text-primary"
        >
          <Cog6ToothIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
