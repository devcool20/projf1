"use client";

import { FormEvent, useState } from "react";

type Props = {
  onTransmit: (message: string) => void;
};

export function TransmitInput({ onTransmit }: Props) {
  const [value, setValue] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!value.trim()) return;

    onTransmit(value.trim());
    setValue("");
  };

  return (
    <form onSubmit={submit} className="sticky bottom-0 z-10 mt-6 border-t border-outline-variant/20 bg-surface-dim/95 pt-4 backdrop-blur">
      <div className="dashboard-panel flex items-center gap-3 p-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full bg-surface-container-low px-3 py-3 font-mono text-xs uppercase tracking-[0.16em] text-on-surface outline-none focus:border-secondary"
          placeholder="ENTER RADIO TRANSCRIPT..."
        />
        <button
          type="submit"
          className="paddock-glow-orange px-5 py-3 font-headline text-xs font-bold tracking-[0.22em] text-white uppercase hover:scale-[1.02]"
          style={{ background: "#ff9b48" }}
        >
          TRANSMIT
        </button>
      </div>
    </form>
  );
}
