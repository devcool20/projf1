import { Router } from "express";
import { config } from "../config.js";
import { requireApiKey } from "./middleware.js";
import {
  getLatestDriverStandings,
  getLatestTeamStandings,
  getLastSuccessfulScrape,
} from "../db/store.js";
import { runScrape } from "../scheduler.js";

const router = Router();

router.get("/api/v1/standings/drivers", (req, res) => {
  const season = Number(req.query.season ?? config.currentSeason);
  const result = getLatestDriverStandings(season);

  if (result.data.length === 0) {
    res.status(404).json({ success: false, error: `No driver data for season ${season}` });
    return;
  }

  res.json({
    success: true,
    meta: {
      season,
      fetchedAt: result.fetchedAt,
      stale: isStale(result.fetchedAt),
      rowCount: result.data.length,
    },
    data: result.data,
  });
});

router.get("/api/v1/standings/teams", (req, res) => {
  const season = Number(req.query.season ?? config.currentSeason);
  const result = getLatestTeamStandings(season);

  if (result.data.length === 0) {
    res.status(404).json({ success: false, error: `No team data for season ${season}` });
    return;
  }

  res.json({
    success: true,
    meta: {
      season,
      fetchedAt: result.fetchedAt,
      stale: isStale(result.fetchedAt),
      rowCount: result.data.length,
    },
    data: result.data,
  });
});

router.post("/api/v1/admin/refresh", requireApiKey, async (_req, res) => {
  try {
    await runScrape();
    res.json({ success: true, message: "Scrape completed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

router.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

router.get("/health/ready", (_req, res) => {
  const driversLast = getLastSuccessfulScrape("drivers");
  const teamsLast = getLastSuccessfulScrape("teams");

  const driversFetchedAt = driversLast?.created_at ?? null;
  const teamsFetchedAt = teamsLast?.created_at ?? null;

  res.json({
    status: "ok",
    drivers: {
      lastSuccess: driversFetchedAt,
      stale: isStale(driversFetchedAt),
    },
    teams: {
      lastSuccess: teamsFetchedAt,
      stale: isStale(teamsFetchedAt),
    },
  });
});

function isStale(fetchedAt: string | null): boolean {
  if (!fetchedAt) return true;
  const ageMs = Date.now() - new Date(fetchedAt).getTime();
  return ageMs > config.staleThresholdHours * 3600_000;
}

export { router };
