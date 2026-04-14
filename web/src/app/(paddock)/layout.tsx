import { PaddockShell } from "@/components/shell/paddock-shell";
import { PropsWithChildren } from "react";
import { CommsProvider } from "@/lib/contexts/comms-context";

export default function PaddockLayout({ children }: PropsWithChildren) {
  return (
    <CommsProvider>
      <PaddockShell>{children}</PaddockShell>
    </CommsProvider>
  );
}
