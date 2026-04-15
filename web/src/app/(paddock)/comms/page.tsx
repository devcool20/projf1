 "use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CommsView } from "@/components/comms/comms-view";

function CommsPageContent() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").toLowerCase();
  const initialThreadId = searchParams.get("t") ?? "";

  return <CommsView query={query} initialThreadId={initialThreadId} />;
}

export default function CommsPage() {
  return (
    <Suspense
      fallback={
        <div className="comms-light-theme grid gap-4 md:grid-cols-2 md:grid-flow-dense">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`card-surface rounded-card border border-outline-variant/30 p-4 sm:p-5 ${i % 2 === 0 ? "h-44" : "h-64"}`}
            />
          ))}
        </div>
      }
    >
      <CommsPageContent />
    </Suspense>
  );
}
