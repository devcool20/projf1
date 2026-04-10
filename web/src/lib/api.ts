import type { ApiDriverStanding, ApiTeamStanding, StandingsApiResponse } from "./types";

const CACHE_TTL_MS = 15_000;
const memoryCache = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const now = Date.now();
  const hit = memoryCache.get(path);
  if (hit && hit.expires > now) {
    return hit.value as T;
  }

  const pending = inflight.get(path);
  if (pending) {
    return pending as Promise<T>;
  }

  const request = (async () => {
    const res = await fetch(path, { cache: "no-store", next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`PDA ${path}: ${res.status}`);
    const json = (await res.json()) as T;
    memoryCache.set(path, { expires: Date.now() + CACHE_TTL_MS, value: json });
    return json;
  })();

  inflight.set(path, request);
  try {
    return await request;
  } finally {
    inflight.delete(path);
  }
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
