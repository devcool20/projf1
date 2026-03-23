import { getDb } from "./connection.js";

export function migrate() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS driver_standings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      season        INTEGER NOT NULL,
      position      INTEGER NOT NULL,
      driver_name   TEXT    NOT NULL,
      driver_code   TEXT    NOT NULL,
      nationality   TEXT    NOT NULL,
      team_name     TEXT    NOT NULL,
      points        INTEGER NOT NULL,
      fetched_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(season, position, fetched_at)
    );

    CREATE TABLE IF NOT EXISTS team_standings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      season        INTEGER NOT NULL,
      position      INTEGER NOT NULL,
      team_name     TEXT    NOT NULL,
      points        INTEGER NOT NULL,
      fetched_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(season, position, fetched_at)
    );

    CREATE TABLE IF NOT EXISTS scrape_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      resource      TEXT    NOT NULL,
      season        INTEGER NOT NULL,
      status        TEXT    NOT NULL CHECK(status IN ('success', 'failure')),
      row_count     INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_driver_standings_season
      ON driver_standings(season, fetched_at DESC);

    CREATE INDEX IF NOT EXISTS idx_team_standings_season
      ON team_standings(season, fetched_at DESC);

    CREATE INDEX IF NOT EXISTS idx_scrape_log_resource
      ON scrape_log(resource, created_at DESC);
  `);
}
