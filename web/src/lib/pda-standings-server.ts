import type { ApiDriverStanding, ApiTeamStanding, StandingsApiResponse } from "./types";

const PDA_BASE_URL =
  process.env.NEXT_PUBLIC_PDA_URL ?? "https://projf1-w7s7.onrender.com";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${PDA_BASE_URL}${path}`, {
    // Cache at the Next.js server layer to speed up initial render.
    // Standings don't need second-by-second freshness.
    next: { revalidate: 15 },
  });

  if (!res.ok) throw new Error(`PDA ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchDriverStandingsServer(season = 2026) {
  return fetchJson<StandingsApiResponse<ApiDriverStanding>>(
    `/api/v1/standings/drivers?season=${season}`,
  );
}

export async function fetchTeamStandingsServer(season = 2026) {
  return fetchJson<StandingsApiResponse<ApiTeamStanding>>(
    `/api/v1/standings/teams?season=${season}`,
  );
}

