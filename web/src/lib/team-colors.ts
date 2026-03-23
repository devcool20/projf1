const TEAM_COLORS: Record<string, { accent: string; bg: string }> = {
  "Mercedes":           { accent: "#00d2be", bg: "rgba(0,210,190,0.12)" },
  "Ferrari":            { accent: "#e10600", bg: "rgba(225,6,0,0.12)" },
  "Red Bull Racing":    { accent: "#3671C6", bg: "rgba(54,113,198,0.12)" },
  "McLaren":            { accent: "#ff8000", bg: "rgba(255,128,0,0.12)" },
  "Alpine":             { accent: "#ff87bc", bg: "rgba(255,135,188,0.12)" },
  "Aston Martin":       { accent: "#229971", bg: "rgba(34,153,113,0.12)" },
  "Williams":           { accent: "#64c4ff", bg: "rgba(100,196,255,0.12)" },
  "Racing Bulls":       { accent: "#6692ff", bg: "rgba(102,146,255,0.12)" },
  "Haas F1 Team":       { accent: "#b6babd", bg: "rgba(182,186,189,0.12)" },
  "Audi":               { accent: "#ff5f5f", bg: "rgba(255,95,95,0.12)" },
  "Cadillac":           { accent: "#c0a44d", bg: "rgba(192,164,77,0.12)" },
};

const FALLBACK = { accent: "#7ef6ee", bg: "rgba(126,246,238,0.08)" };

export function getTeamColor(teamName: string) {
  return TEAM_COLORS[teamName] ?? FALLBACK;
}

const NATIONALITY_FLAGS: Record<string, string> = {
  GBR: "🇬🇧", NED: "🇳🇱", MON: "🇲🇨", ESP: "🇪🇸", AUS: "🇦🇺",
  FRA: "🇫🇷", CAN: "🇨🇦", MEX: "🇲🇽", FIN: "🇫🇮", GER: "🇩🇪",
  THA: "🇹🇭", ITA: "🇮🇹", NZL: "🇳🇿", BRA: "🇧🇷", ARG: "🇦🇷",
  JPN: "🇯🇵", CHN: "🇨🇳", USA: "🇺🇸", DEN: "🇩🇰", POL: "🇵🇱",
};

export function getNationalityFlag(code: string) {
  return NATIONALITY_FLAGS[code] ?? code;
}
