import * as cheerio from "cheerio";
import { teamStandingSchema, type TeamStanding } from "../schemas/standings.js";

const BASE_URL = "https://www.formula1.com/en/results";

export async function scrapeTeamStandings(season: number): Promise<TeamStanding[]> {
  const url = `${BASE_URL}/${season}/team`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PaddockDataAgent/0.1 (+https://github.com/paddock-os)",
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch team standings: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows: TeamStanding[] = [];

  $("table tbody tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;

    const posText = $(cells[0]).text().trim();
    const teamName = $(cells[1]).text().trim();
    const pointsText = $(cells[2]).text().trim();

    const parsed = teamStandingSchema.safeParse({
      position: Number(posText),
      teamName,
      points: Number(pointsText),
      season,
    });

    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      console.warn(`[teams] Skipping row ${posText}: ${parsed.error.message}`);
    }
  });

  if (rows.length === 0) {
    throw new Error("Parsed zero team rows — page structure may have changed");
  }

  return rows;
}
