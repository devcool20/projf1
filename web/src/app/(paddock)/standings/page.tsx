import { StandingsScreen } from "@/components/standings/standings-screen";
import {
  fetchDriverStandingsServer,
  fetchTeamStandingsServer,
} from "@/lib/pda-standings-server";

export default async function StandingsPage() {
  try {
    const [dRes, tRes] = await Promise.all([
      fetchDriverStandingsServer(),
      fetchTeamStandingsServer(),
    ]);

    return (
      <StandingsScreen
        initialDrivers={dRes.data}
        initialTeams={tRes.data}
        initialFetchedAt={dRes.meta.fetchedAt}
      />
    );
  } catch {
    // If server fetch fails (agent down), let the client component handle retry.
    return <StandingsScreen />;
  }
}
