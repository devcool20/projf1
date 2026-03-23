import { telemetryTickerItems } from "@/lib/mock-data";

export function TelemetryTicker() {
  const tape = [...telemetryTickerItems, ...telemetryTickerItems];

  return (
    <div className="ticker-wrap hidden max-w-xl overflow-hidden border-l-2 border-primary bg-surface-container-high/60 px-4 py-1.5 lg:block">
      <div className="ticker-move">
        {tape.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="mr-8 font-mono text-[10px] tracking-[0.25em] text-on-surface-variant uppercase"
          >
            <span className="mr-2 text-primary">●</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
