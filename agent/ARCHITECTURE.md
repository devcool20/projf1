# Paddock Data Agent (PDA) — Architecture & PRD

## 1. Product Summary

**Name:** Paddock Data Agent (PDA)
**Role:** Standalone scraping microservice that periodically collects structured Formula 1 data from public pages on formula1.com and exposes it to projf1 via a REST JSON API.

**Initial data sources (MVP):**

| Resource | URL |
|----------|-----|
| Drivers' Standings | `https://www.formula1.com/en/results/{season}/drivers` |
| Teams' Standings | `https://www.formula1.com/en/results/{season}/team` |

**Future expansion targets (post-MVP):**
Race results, qualifying results, sprint results, race schedule/calendar, fastest laps.

---

## 2. Goals

1. **Decouple** scraping from the frontend — the Next.js app never touches formula1.com.
2. **Normalize** scraped HTML into stable, typed JSON with validation.
3. **Persist** standings history so the app survives scrape failures gracefully.
4. **Monitor** freshness — expose health endpoints and log failures.
5. **Extend** easily — adding a new scraper should be one file + one cron entry.

---

## 3. Non-Goals (MVP)

- Live timing / real-time telemetry (requires official F1 timing APIs).
- Scraping login-gated or F1 TV content.
- Running scrapers inside the user's browser or inside Vercel functions.

---

## 4. Data Model

### DriverStanding

| Field | Type | Example |
|-------|------|---------|
| position | number | 1 |
| driverName | string | "George Russell" |
| driverCode | string | "RUS" |
| nationality | string | "GBR" |
| teamName | string | "Mercedes" |
| points | number | 51 |
| season | number | 2026 |
| fetchedAt | ISO string | "2026-03-23T10:00:00Z" |

### TeamStanding

| Field | Type | Example |
|-------|------|---------|
| position | number | 1 |
| teamName | string | "Mercedes" |
| points | number | 98 |
| season | number | 2026 |
| fetchedAt | ISO string | "2026-03-23T10:00:00Z" |

### ScrapeLog

| Field | Type |
|-------|------|
| id | auto |
| resource | "drivers" or "teams" |
| season | number |
| status | "success" or "failure" |
| rowCount | number |
| errorMessage | string (nullable) |
| createdAt | ISO string |

---

## 5. Technical Architecture

```
┌─────────────────────────────────────────────────┐
│              Paddock Data Agent                  │
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │ Scheduler│──>│ Scrapers │──>│  Validator  │  │
│  │(node-cron│   │(cheerio) │   │   (zod)     │  │
│  └──────────┘   └──────────┘   └─────┬───────┘  │
│                                      │          │
│                              ┌───────▼───────┐  │
│                              │   SQLite DB   │  │
│                              └───────┬───────┘  │
│                                      │          │
│                              ┌───────▼───────┐  │
│                              │  Express API  │  │
│                              │ /api/v1/...   │  │
│                              └───────────────┘  │
└─────────────────────────────────────────────────┘
         ▲                              │
         │ scrapes                      │ JSON responses
         ▼                              ▼
   formula1.com               projf1 (Next.js)
```

### Component Breakdown

1. **Scheduler** — `node-cron` running inside the same process.
2. **Scrapers** — HTTP fetch + `cheerio` HTML parsing (no headless browser needed; F1 results pages are server-rendered).
3. **Validator** — Zod schemas reject malformed data before it enters the DB.
4. **Store** — SQLite via `better-sqlite3` (zero-config, single file, perfect for MVP).
5. **API** — Express serving read-only JSON endpoints + health checks.

### Why Not Playwright?

The F1 results pages are server-rendered HTML tables. A simple `fetch` + `cheerio` parse is faster, lighter, and cheaper than spinning up a headless browser. If F1 switches to heavy client-side rendering, Playwright can be swapped in at the scraper layer without changing the API or DB.

---

## 6. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Runtime | Node.js 20+ / TypeScript | Same ecosystem as projf1 |
| HTTP Client | Native `fetch` (Node 20) | No extra dependency |
| HTML Parser | `cheerio` | Fast, jQuery-like DOM querying |
| Validation | `zod` | Type-safe schema validation |
| Database | `better-sqlite3` | Embedded, zero-config, fast reads |
| API Server | `express` | Minimal, well-known |
| Scheduler | `node-cron` | In-process cron expressions |
| Build | `tsx` for dev, `tsc` for prod | Fast iteration |

---

## 7. API Contract

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/standings/drivers?season=2026` | Current driver standings |
| GET | `/api/v1/standings/teams?season=2026` | Current team standings |
| POST | `/api/v1/admin/refresh` | Trigger immediate scrape (requires API key) |
| GET | `/health` | Basic liveness |
| GET | `/health/ready` | DB status + last successful scrape age |

### Response Shape

```json
{
  "success": true,
  "meta": {
    "season": 2026,
    "fetchedAt": "2026-03-23T10:00:00.000Z",
    "stale": false,
    "rowCount": 22
  },
  "data": [
    {
      "position": 1,
      "driverName": "George Russell",
      "driverCode": "RUS",
      "nationality": "GBR",
      "teamName": "Mercedes",
      "points": 51
    }
  ]
}
```

### Error Shape

```json
{
  "success": false,
  "error": "No data found for season 2025"
}
```

---

## 8. Scrape Schedule

| Context | Cron | Interval |
|---------|------|----------|
| Default (non-race week) | `0 */6 * * *` | Every 6 hours |
| Race weekend (Fri–Sun) | `*/15 * * * *` | Every 15 minutes |
| Manual | POST `/api/v1/admin/refresh` | On demand |

The `SCRAPE_CRON` env var controls the default. Race-weekend mode can be toggled via env or a future schedule-aware trigger.

---

## 9. Hosting Recommendation

| Option | Cost | Fit |
|--------|------|-----|
| **Railway** | Free tier / $5 | Best DX, single service + SQLite volume |
| **Fly.io** | Free tier | Persistent volume for SQLite |
| **Render** | Free tier | Background worker + web service |
| **VPS (any)** | ~$5/mo | Full control |

**Recommendation for MVP:** Railway or Fly.io with a persistent volume for the SQLite file.

**Do not run on Vercel** — serverless functions have execution time limits and no persistent filesystem.

---

## 10. Security

- **CORS:** Allow only your projf1 domain(s).
- **Admin endpoints:** Protected by `API_KEY` header.
- **Rate limiting:** Express middleware, 60 req/min per IP.
- **No secrets in repo:** `.env` file with `.env.example` template.

---

## 11. Monitoring & Alerting

- `/health/ready` returns `stale: true` when last successful scrape is older than threshold.
- `ScrapeLog` table tracks every attempt.
- Future: webhook to Discord/Slack on consecutive failures.

---

## 12. Directory Structure

```
agent/
├── src/
│   ├── index.ts            # Entry: start API + scheduler
│   ├── config.ts           # Env vars + defaults
│   ├── db/
│   │   ├── connection.ts   # SQLite setup
│   │   └── migrate.ts      # Table creation
│   ├── scrapers/
│   │   ├── drivers.ts      # Driver standings scraper
│   │   └── teams.ts        # Team standings scraper
│   ├── schemas/
│   │   └── standings.ts    # Zod validation schemas
│   ├── api/
│   │   ├── router.ts       # Express router
│   │   └── middleware.ts   # CORS, auth, rate limit
│   └── scheduler.ts        # Cron job wiring
├── data/                   # SQLite file lives here (gitignored)
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── ARCHITECTURE.md         # This file
```

---

## 13. Extension Playbook (Post-MVP)

To add a new data source:

1. Create `src/scrapers/new-resource.ts` (fetch + parse + return typed array).
2. Add Zod schema in `src/schemas/`.
3. Add DB table in `src/db/migrate.ts`.
4. Add API route in `src/api/router.ts`.
5. Register cron job in `src/scheduler.ts`.

No changes needed to the core framework.
