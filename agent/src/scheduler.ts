import cron from "node-cron";
import { config } from "./config.js";
import { scrapeDriverStandings } from "./scrapers/drivers.js";
import { scrapeTeamStandings } from "./scrapers/teams.js";
import { insertDriverStandings, insertTeamStandings, logScrape } from "./db/store.js";

export async function runScrape() {
  const season = config.currentSeason;
  console.log(`[scrape] Starting scrape for season ${season}...`);

  // Driver standings
  try {
    const drivers = await scrapeDriverStandings(season);
    insertDriverStandings(drivers);
    logScrape("drivers", season, "success", drivers.length);
    console.log(`[scrape] Drivers: ${drivers.length} rows stored`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logScrape("drivers", season, "failure", 0, msg);
    console.error(`[scrape] Drivers FAILED: ${msg}`);
  }

  // Team standings
  try {
    const teams = await scrapeTeamStandings(season);
    insertTeamStandings(teams);
    logScrape("teams", season, "success", teams.length);
    console.log(`[scrape] Teams: ${teams.length} rows stored`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logScrape("teams", season, "failure", 0, msg);
    console.error(`[scrape] Teams FAILED: ${msg}`);
  }
}

export function startScheduler() {
  const expression = config.scrapeCron;
  if (!cron.validate(expression)) {
    console.error(`[scheduler] Invalid cron expression: ${expression}`);
    return;
  }

  console.log(`[scheduler] Cron registered: ${expression}`);
  cron.schedule(expression, () => {
    runScrape().catch((err) => console.error("[scheduler] Unexpected error:", err));
  });
}
