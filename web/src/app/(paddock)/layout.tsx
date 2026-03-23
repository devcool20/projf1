import { PaddockShell } from "@/components/shell/paddock-shell";
import { PropsWithChildren } from "react";

export default function PaddockLayout({ children }: PropsWithChildren) {
  return <PaddockShell>{children}</PaddockShell>;
}
