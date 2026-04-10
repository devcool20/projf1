import { StandingsScreen } from "@/components/standings/standings-screen";
import {
  fetchDriverStandingsServer,
  fetchTeamStandingsServer,
} from "@/lib/pda-standings-server";

export default async function StandingsPage() {
  const [dRes, tRes] = await Promise.allSettled([
    fetchDriverStandingsServer(),
    fetchTeamStandingsServer(),
  ]);

  const hasData = dRes.status === "fulfilled" && tRes.status === "fulfilled";

  return (
    <StandingsScreen
      initialDrivers={hasData ? dRes.value.data : undefined}
      initialTeams={hasData ? tRes.value.data : undefined}
      initialFetchedAt={hasData ? dRes.value.meta.fetchedAt : undefined}
    />
  );
}
