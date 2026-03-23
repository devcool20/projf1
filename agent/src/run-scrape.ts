import { migrate } from "./db/migrate.js";
import { runScrape } from "./scheduler.js";

migrate();
await runScrape();
console.log("[run-scrape] Done");
process.exit(0);
