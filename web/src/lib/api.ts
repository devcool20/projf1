import type { ApiDriverStanding, ApiTeamStanding, StandingsApiResponse } from "./types";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`PDA ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchDriverStandings(season = 2026) {
  return fetchJson<StandingsApiResponse<ApiDriverStanding>>(
    `/api/pda/standings/drivers?season=${season}`,
  );
}

export async function fetchTeamStandings(season = 2026) {
  return fetchJson<StandingsApiResponse<ApiTeamStanding>>(
    `/api/pda/standings/teams?season=${season}`,
  );
}
