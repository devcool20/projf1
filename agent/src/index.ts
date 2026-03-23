import express from "express";
import { config } from "./config.js";
import { migrate } from "./db/migrate.js";
import { router } from "./api/router.js";
import { corsMiddleware, rateLimiter } from "./api/middleware.js";
import { startScheduler, runScrape } from "./scheduler.js";

const app = express();

app.use(corsMiddleware);
app.use(rateLimiter);
app.use(router);

migrate();

app.listen(config.port, () => {
  console.log(`[pda] Paddock Data Agent running on http://localhost:${config.port}`);
  console.log(`[pda] Season: ${config.currentSeason}`);
  console.log(`[pda] CORS origin: ${config.corsOrigin}`);

  runScrape().then(() => {
    console.log("[pda] Initial scrape complete");
  });

  startScheduler();
});
