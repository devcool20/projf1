/**
 * 2026 Formula 1 World Championship — public calendar dates (UTC session anchors).
 * Sources: formula1.com 2026 season announcement, BBC Sport / Yahoo Sports schedule summaries.
 * Qualifying times are approximate UTC; adjust in Supabase `prediction_config.qualifying_at` for locks.
 */

export type F1Round2026 = {
  round: number;
  /** Official-style name — match `prediction_config.event_name` loosely */
  name: string;
  slug: string;
  country: string;
  circuit: string;
  flagEmoji: string;
  fp1Iso: string;
  qualifyingIso: string;
  raceIso: string;
  /** Substrings to match DB `event_name` (case-insensitive) */
  matchTokens: string[];
};

const MS_DAY = 86_400_000;
const MS_HOUR = 3_600_000;

/** Rounds 1–14 (spring / early summer); extend file as season progresses. */
export const F1_2026_CALENDAR: F1Round2026[] = [
  {
    round: 1,
    name: "Australian Grand Prix",
    slug: "australia",
    country: "Australia",
    circuit: "Albert Park",
    flagEmoji: "🇦🇺",
    fp1Iso: "2026-03-12T01:30:00.000Z",
    qualifyingIso: "2026-03-14T05:00:00.000Z",
    raceIso: "2026-03-15T04:00:00.000Z",
    matchTokens: ["australian", "australia", "melbourne", "albert park"],
  },
  {
    round: 2,
    name: "Chinese Grand Prix",
    slug: "china",
    country: "China",
    circuit: "Shanghai International Circuit",
    flagEmoji: "🇨🇳",
    fp1Iso: "2026-03-20T03:30:00.000Z",
    qualifyingIso: "2026-03-21T07:00:00.000Z",
    raceIso: "2026-03-22T07:00:00.000Z",
    matchTokens: ["chinese", "china", "shanghai"],
  },
  {
    round: 3,
    name: "Japanese Grand Prix",
    slug: "japan",
    country: "Japan",
    circuit: "Suzuka International Racing Course",
    flagEmoji: "🇯🇵",
    fp1Iso: "2026-03-27T02:00:00.000Z",
    qualifyingIso: "2026-03-28T06:00:00.000Z",
    raceIso: "2026-03-29T05:00:00.000Z",
    matchTokens: ["japanese", "japan", "suzuka"],
  },
  {
    round: 4,
    name: "Bahrain Grand Prix",
    slug: "bahrain",
    country: "Bahrain",
    circuit: "Bahrain International Circuit",
    flagEmoji: "🇧🇭",
    fp1Iso: "2026-04-10T11:30:00.000Z",
    qualifyingIso: "2026-04-11T16:00:00.000Z",
    raceIso: "2026-04-12T15:00:00.000Z",
    matchTokens: ["bahrain", "sakhir"],
  },
  {
    round: 5,
    name: "Saudi Arabian Grand Prix",
    slug: "saudi-arabia",
    country: "Saudi Arabia",
    circuit: "Jeddah Corniche Circuit",
    flagEmoji: "🇸🇦",
    fp1Iso: "2026-04-17T17:30:00.000Z",
    qualifyingIso: "2026-04-18T17:00:00.000Z",
    raceIso: "2026-04-19T17:00:00.000Z",
    matchTokens: ["saudi", "jeddah", "arabian"],
  },
  {
    round: 6,
    name: "Miami Grand Prix",
    slug: "miami",
    country: "United States",
    circuit: "Miami International Autodrome",
    flagEmoji: "🇺🇸",
    fp1Iso: "2026-05-01T16:30:00.000Z",
    qualifyingIso: "2026-05-02T20:00:00.000Z",
    raceIso: "2026-05-03T20:00:00.000Z",
    matchTokens: ["miami", "crypto.com miami"],
  },
  {
    round: 7,
    name: "Canadian Grand Prix",
    slug: "canada",
    country: "Canada",
    circuit: "Circuit Gilles Villeneuve",
    flagEmoji: "🇨🇦",
    fp1Iso: "2026-05-22T17:30:00.000Z",
    qualifyingIso: "2026-05-23T20:00:00.000Z",
    raceIso: "2026-05-24T18:00:00.000Z",
    matchTokens: ["canadian", "canada", "montreal", "gilles villeneuve"],
  },
  {
    round: 8,
    name: "Monaco Grand Prix",
    slug: "monaco",
    country: "Monaco",
    circuit: "Circuit de Monaco",
    flagEmoji: "🇲🇨",
    fp1Iso: "2026-05-29T11:30:00.000Z",
    qualifyingIso: "2026-05-30T14:00:00.000Z",
    raceIso: "2026-05-31T13:00:00.000Z",
    matchTokens: ["monaco", "monte carlo"],
  },
  {
    round: 9,
    name: "Spanish Grand Prix",
    slug: "spain",
    country: "Spain",
    circuit: "Circuit de Barcelona-Catalunya",
    flagEmoji: "🇪🇸",
    fp1Iso: "2026-06-12T11:30:00.000Z",
    qualifyingIso: "2026-06-13T14:00:00.000Z",
    raceIso: "2026-06-14T13:00:00.000Z",
    matchTokens: ["spanish", "spain", "barcelona", "catalunya"],
  },
  {
    round: 10,
    name: "Austrian Grand Prix",
    slug: "austria",
    country: "Austria",
    circuit: "Red Bull Ring",
    flagEmoji: "🇦🇹",
    fp1Iso: "2026-06-26T09:30:00.000Z",
    qualifyingIso: "2026-06-27T12:00:00.000Z",
    raceIso: "2026-06-28T13:00:00.000Z",
    matchTokens: ["austrian", "austria", "red bull ring", "spielberg"],
  },
  {
    round: 11,
    name: "British Grand Prix",
    slug: "great-britain",
    country: "United Kingdom",
    circuit: "Silverstone",
    flagEmoji: "🇬🇧",
    fp1Iso: "2026-07-03T11:30:00.000Z",
    qualifyingIso: "2026-07-04T14:00:00.000Z",
    raceIso: "2026-07-05T14:00:00.000Z",
    matchTokens: ["british", "silverstone", "great britain", "uk gp"],
  },
  {
    round: 12,
    name: "Belgian Grand Prix",
    slug: "belgium",
    country: "Belgium",
    circuit: "Circuit de Spa-Francorchamps",
    flagEmoji: "🇧🇪",
    fp1Iso: "2026-07-24T10:30:00.000Z",
    qualifyingIso: "2026-07-25T13:00:00.000Z",
    raceIso: "2026-07-26T13:00:00.000Z",
    matchTokens: ["belgian", "belgium", "spa"],
  },
  {
    round: 13,
    name: "Hungarian Grand Prix",
    slug: "hungary",
    country: "Hungary",
    circuit: "Hungaroring",
    flagEmoji: "🇭🇺",
    fp1Iso: "2026-07-31T11:30:00.000Z",
    qualifyingIso: "2026-08-01T14:00:00.000Z",
    raceIso: "2026-08-02T13:00:00.000Z",
    matchTokens: ["hungarian", "hungary", "hungaroring"],
  },
  {
    round: 14,
    name: "Dutch Grand Prix",
    slug: "netherlands",
    country: "Netherlands",
    circuit: "Circuit Zandvoort",
    flagEmoji: "🇳🇱",
    fp1Iso: "2026-08-28T09:30:00.000Z",
    qualifyingIso: "2026-08-29T12:00:00.000Z",
    raceIso: "2026-08-30T13:00:00.000Z",
    matchTokens: ["dutch", "netherlands", "zandvoort"],
  },
];

export type PredictionConfigRow = {
  id: string;
  event_name: string;
  qualifying_at: string;
  lat?: string | null;
  is_active?: boolean | null;
};

export function matchConfigToRound(
  configs: PredictionConfigRow[],
  round: F1Round2026,
): PredictionConfigRow | null {
  const norm = (s: string) => s.toLowerCase();
  for (const c of configs) {
    const en = norm(c.event_name);
    if (round.matchTokens.some((t) => en.includes(norm(t)))) return c;
  }
  return null;
}

/**
 * Grand Prix is listed for predictions if first practice is within the next `horizonDays`
 * (from "now") OR has already started but the race has not ended (approx race + 4h).
 */
export function isRoundInPredictionHorizon(
  round: F1Round2026,
  now = new Date(),
  horizonDays = 30,
): boolean {
  const fp1 = new Date(round.fp1Iso).getTime();
  const raceEnd = new Date(round.raceIso).getTime() + 4 * MS_HOUR;
  const horizon = now.getTime() + horizonDays * MS_DAY;
  const startedOrSoon = fp1 <= horizon;
  const notFinished = raceEnd >= now.getTime();
  return startedOrSoon && notFinished;
}

export function getQualifyingLockTimeMs(round: F1Round2026, config: PredictionConfigRow | null): number {
  if (config?.qualifying_at) return new Date(config.qualifying_at).getTime();
  return new Date(round.qualifyingIso).getTime();
}

export function formatGpRange(round: F1Round2026): string {
  const fp1 = new Date(round.fp1Iso);
  const race = new Date(round.raceIso);
  const sameMonth = fp1.getUTCMonth() === race.getUTCMonth();
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (sameMonth) {
    return `${fp1.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}–${race.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `${fp1.toLocaleDateString("en-GB", opts)} – ${race.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}
