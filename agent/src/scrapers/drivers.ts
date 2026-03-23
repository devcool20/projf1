import * as cheerio from "cheerio";
import { driverStandingSchema, type DriverStanding } from "../schemas/standings.js";

const BASE_URL = "https://www.formula1.com/en/results";

export async function scrapeDriverStandings(season: number): Promise<DriverStanding[]> {
  const url = `${BASE_URL}/${season}/drivers`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "PaddockDataAgent/0.1 (+https://github.com/paddock-os)",
      Accept: "text/html",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch driver standings: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const rows: DriverStanding[] = [];

  $("table tbody tr").each((_i, row) => {
    const cells = $(row).find("td");
    if (cells.length < 5) return;

    const posText = $(cells[0]).text().trim();
    const driverCell = $(cells[1]).text().trim();
    const nationality = $(cells[2]).text().trim();
    const teamName = $(cells[3]).text().trim();
    const pointsText = $(cells[4]).text().trim();

    const codeMatch = driverCell.match(/([A-Z]{3})$/);
    const driverCode = codeMatch ? codeMatch[1] : "";
    const driverName = driverCell.replace(/[A-Z]{3}$/, "").replace(/\u00a0/g, " ").trim();

    const parsed = driverStandingSchema.safeParse({
      position: Number(posText),
      driverName,
      driverCode,
      nationality,
      teamName,
      points: Number(pointsText),
      season,
    });

    if (parsed.success) {
      rows.push(parsed.data);
    } else {
      console.warn(`[drivers] Skipping row ${posText}: ${parsed.error.message}`);
    }
  });

  if (rows.length === 0) {
    throw new Error("Parsed zero driver rows — page structure may have changed");
  }

  return rows;
}
