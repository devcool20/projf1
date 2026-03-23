import { getDb } from "./connection.js";
import type { DriverStanding, TeamStanding } from "../schemas/standings.js";

export function insertDriverStandings(standings: DriverStanding[]) {
  const db = getDb();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO driver_standings
      (season, position, driver_name, driver_code, nationality, team_name, points, fetched_at)
    VALUES
      (@season, @position, @driverName, @driverCode, @nationality, @teamName, @points, @fetchedAt)
  `);

  const tx = db.transaction((rows: DriverStanding[]) => {
    for (const row of rows) {
      insert.run({ ...row, fetchedAt: now });
    }
  });

  tx(standings);
}

export function insertTeamStandings(standings: TeamStanding[]) {
  const db = getDb();
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT OR REPLACE INTO team_standings
      (season, position, team_name, points, fetched_at)
    VALUES
      (@season, @position, @teamName, @points, @fetchedAt)
  `);

  const tx = db.transaction((rows: TeamStanding[]) => {
    for (const row of rows) {
      insert.run({ ...row, fetchedAt: now });
    }
  });

  tx(standings);
}

export function logScrape(
  resource: string,
  season: number,
  status: "success" | "failure",
  rowCount: number,
  errorMessage?: string
) {
  const db = getDb();
  db.prepare(`
    INSERT INTO scrape_log (resource, season, status, row_count, error_message)
    VALUES (?, ?, ?, ?, ?)
  `).run(resource, season, status, rowCount, errorMessage ?? null);
}

export function getLatestDriverStandings(season: number) {
  const db = getDb();
  const latestFetch = db
    .prepare(`SELECT MAX(fetched_at) as fetched_at FROM driver_standings WHERE season = ?`)
    .get(season) as { fetched_at: string | null } | undefined;

  if (!latestFetch?.fetched_at) return { fetchedAt: null, data: [] };

  const rows = db
    .prepare(
      `SELECT position, driver_name, driver_code, nationality, team_name, points
       FROM driver_standings
       WHERE season = ? AND fetched_at = ?
       ORDER BY position ASC`
    )
    .all(season, latestFetch.fetched_at) as Array<{
    position: number;
    driver_name: string;
    driver_code: string;
    nationality: string;
    team_name: string;
    points: number;
  }>;

  return {
    fetchedAt: latestFetch.fetched_at,
    data: rows.map((r) => ({
      position: r.position,
      driverName: r.driver_name,
      driverCode: r.driver_code,
      nationality: r.nationality,
      teamName: r.team_name,
      points: r.points,
    })),
  };
}

export function getLatestTeamStandings(season: number) {
  const db = getDb();
  const latestFetch = db
    .prepare(`SELECT MAX(fetched_at) as fetched_at FROM team_standings WHERE season = ?`)
    .get(season) as { fetched_at: string | null } | undefined;

  if (!latestFetch?.fetched_at) return { fetchedAt: null, data: [] };

  const rows = db
    .prepare(
      `SELECT position, team_name, points
       FROM team_standings
       WHERE season = ? AND fetched_at = ?
       ORDER BY position ASC`
    )
    .all(season, latestFetch.fetched_at) as Array<{
    position: number;
    team_name: string;
    points: number;
  }>;

  return {
    fetchedAt: latestFetch.fetched_at,
    data: rows.map((r) => ({
      position: r.position,
      teamName: r.team_name,
      points: r.points,
    })),
  };
}

export function getLastSuccessfulScrape(resource: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT created_at FROM scrape_log
       WHERE resource = ? AND status = 'success'
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(resource) as { created_at: string } | undefined;
}
