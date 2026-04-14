import { getTeamAccent } from "@/lib/team-colors";

const ROOT = "--team-accent";

export { getTeamAccent as getTeamColor } from "@/lib/team-colors";

export function applyTeamAccent(teamName?: string | null) {
  if (typeof document === "undefined") return;
  const accent = getTeamAccent(teamName);
  document.documentElement.style.setProperty(ROOT, accent);
}

export function resetTeamAccent() {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty(ROOT);
}
