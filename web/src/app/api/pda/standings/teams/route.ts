import { NextResponse } from "next/server";

import type { ApiTeamStanding, StandingsApiResponse } from "@/lib/types";

const PDA_BASE_URL =
  process.env.NEXT_PUBLIC_PDA_URL ?? "https://projf1-w7s7.onrender.com";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const season = Number(url.searchParams.get("season") ?? "2026");

  const pdaRes = await fetch(
    `${PDA_BASE_URL}/api/v1/standings/teams?season=${season}`,
    { cache: "no-store" },
  );

  if (!pdaRes.ok) {
    const text = await pdaRes.text().catch(() => "");
    return NextResponse.json(
      { success: false, error: `PDA teams fetch failed (${pdaRes.status}). ${text}` },
      { status: pdaRes.status },
    );
  }

  return NextResponse.json(
    (await pdaRes.json()) as StandingsApiResponse<ApiTeamStanding>,
  );
}

