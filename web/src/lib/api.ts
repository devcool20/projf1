import type { ApiDriverStanding, ApiTeamStanding, StandingsApiResponse } from "./types";

const PDA_BASE = process.env.NEXT_PUBLIC_PDA_URL ?? "http://localhost:4100";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PDA_BASE}${path}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`PDA ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchDriverStandings(season = 2026) {
  return fetchJson<StandingsApiResponse<ApiDriverStanding>>(
    `/api/v1/standings/drivers?season=${season}`,
  );
}

export async function fetchTeamStandings(season = 2026) {
  return fetchJson<StandingsApiResponse<ApiTeamStanding>>(
    `/api/v1/standings/teams?season=${season}`,
  );
}
