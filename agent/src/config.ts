import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT ?? 4100),
  apiKey: process.env.API_KEY ?? "dev-key",
  scrapeCron: process.env.SCRAPE_CRON ?? "0 */6 * * *",
  currentSeason: Number(process.env.CURRENT_SEASON ?? new Date().getFullYear()),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  staleThresholdHours: Number(process.env.STALE_THRESHOLD_HOURS ?? 24),
  dbPath: path.resolve(__dirname, "..", "data", "paddock.db"),
  dataDir: path.resolve(__dirname, "..", "data"),
} as const;
