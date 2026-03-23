import { redirect } from "next/navigation";

export default function TelemetryRedirectPage() {
  redirect("/predictions");
}
