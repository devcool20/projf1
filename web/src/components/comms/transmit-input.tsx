"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";

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
        <motion.button
          type="submit"
          whileTap={{ scale: 0.95 }}
          className="btn-premium btn-accent px-5 py-3 text-xs tracking-widest uppercase"
        >
          TRANSMIT
        </motion.button>
      </div>
    </form>
  );
}
