import { telemetryTickerItems } from "@/lib/mock-data";

export function TelemetryTicker() {
  const tape = [...telemetryTickerItems, ...telemetryTickerItems];

  return (
    <div className="ticker-wrap max-w-full overflow-hidden rounded-full border border-slate-200/90 bg-white/80 px-4 py-1.5">
      <div className="ticker-move">
        {tape.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="mr-8 font-mono text-[10px] tracking-[0.16em] text-on-surface-variant uppercase"
          >
            <span className="mr-2 text-primary">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
