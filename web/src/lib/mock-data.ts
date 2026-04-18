import {
  CommThread,
  DriverStanding,
  LiveStanding,
  NavItem,
  PitStop,
  PitWallThread,
  PredictionConfig,
  RacePrediction,
  RaceWeekend,
  ScreeningEvent,
  Product,
  ProfileData,
  StrategyStint,
  Team,
  TelemetryStat,
  Transcript,
} from "@/lib/types";

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "layout-dashboard" },
  { label: "Comms", href: "/comms", icon: "radio" },
  { label: "Predictions", href: "/predictions", icon: "gauge" },
  { label: "Paddock Premieres", href: "/paddock-premieres", icon: "clapperboard" },
  { label: "Standings", href: "/standings", icon: "trophy" },
  { label: "Parc Ferme", href: "/parc-ferme", icon: "sparkles" },
];

export const teams: Team[] = [
  { id: "mercedes", name: "Mercedes", accent: "#7ef6ee" },
  { id: "redbull", name: "Red Bull", accent: "#4c6fff" },
  { id: "ferrari", name: "Ferrari", accent: "#e10600" },
  { id: "mclaren", name: "McLaren", accent: "#ff9b48" },
];

export const telemetryTickerItems = [
  "LAP 42 // HAM +0.4s // VER PUSH MODE",
  "SECTOR 2 // TRACK TEMP 31C // WIND +7KMH",
  "RACE CTRL // YELLOW FLAG CLEARED // GREEN",
  "PIT WINDOW OPEN // HARD DELTA +0.8s // BOX THIS LAP",
];

export const transcripts: Transcript[] = [
  {
    id: "t1",
    author: "Lewis Hamilton",
    handle: "@HAM_44",
    teamId: "mercedes",
    channel: "CHANNEL 04",
    timestamp: "14:02:44",
    message:
      "Tires are going off. Requesting box-box end of this lap for the hard compound.",
    likes: 4200,
    comments: 128,
  },
  {
    id: "t2",
    author: "Mercedes Strategy",
    handle: "@MERCEDES_STRAT",
    teamId: "mercedes",
    channel: "CHANNEL 12",
    timestamp: "14:03:05",
    message:
      "Verstappen is closing by 0.2. Expect DRS pressure in sector 3. Keep deployment mode 6.",
    likes: 12500,
    comments: 1210,
    mediaUrl:
      "https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=1400&q=80",
  },
  {
    id: "t3",
    author: "Race Control",
    handle: "@RACE_CONTROL",
    teamId: "ferrari",
    channel: "CHANNEL RC",
    timestamp: "14:03:31",
    message:
      "Yellow flag sector 1. Debris reported at turn 4. Safety car under review.",
    likes: 8600,
    comments: 992,
    severity: "warning",
  },
];

export const commThreads: CommThread[] = [
  {
    id: "ct1",
    profileId: "p-ananya-rao",
    username: "@racecraft_44",
    fullName: "Ananya Rao",
    message: "I think Lewis is gonna have a good year at Ferrari. The adaptation curve looks much sharper than expected.",
    imageUrl:
      "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?auto=format&fit=crop&w=1400&q=80",
    likes: 284,
    comments: 41,
    createdAt: "2h ago",
    replies: [
      {
        id: "r1",
        profileId: "p-kabir-menon",
        username: "@downforce_lab",
        fullName: "Kabir Menon",
        message: "Agreed. His long-run management is still elite, and Ferrari's race pace is finally stable.",
        likes: 39,
        createdAt: "1h ago",
        replies: [
          {
            id: "r1_1",
            profileId: "p-aditi-singh",
            username: "@apex_ana",
            fullName: "Aditi Singh",
            message: "Tire wear discipline will decide everything, especially in hotter tracks.",
            likes: 11,
            createdAt: "48m ago",
            replies: [],
          },
        ],
      },
    ],
  },
  {
    id: "ct2",
    profileId: "p-rohan-verma",
    username: "@telemetry_nerd",
    fullName: "Rohan Verma",
    message: "Mercedes finally found straight-line speed. If they keep this development pace, title fight gets very real.",
    likes: 192,
    comments: 27,
    createdAt: "3h ago",
    replies: [
      {
        id: "r2",
        profileId: "p-isha-kapoor",
        username: "@sector3queen",
        fullName: "Isha Kapoor",
        message: "Their qualifying ceiling is still inconsistent, but race trim is very strong.",
        likes: 18,
        createdAt: "2h ago",
        replies: [],
      },
    ],
  },
  {
    id: "ct3",
    profileId: "p-neel-khanna",
    username: "@f1_weekend_ops",
    fullName: "Neel Khanna",
    message: "McLaren pit wall calls look cleaner this season. Feels like they finally trust one unified strategy model.",
    likes: 131,
    comments: 19,
    createdAt: "4h ago",
    replies: [],
  },
  {
    id: "ct4",
    profileId: "p-sara-bansal",
    username: "@gridwatch",
    fullName: "Sara Bansal",
    message: "Could be a three-team fight by mid-season if upgrades land on schedule. This might be the best year in a decade.",
    likes: 356,
    comments: 63,
    createdAt: "5h ago",
    replies: [],
  },
];

export const liveStandings: LiveStanding[] = [
  { position: 1, driver: "VER", team: "Red Bull", gap: "LEADER" },
  { position: 2, driver: "HAM", team: "Mercedes", gap: "+0.421" },
  { position: 3, driver: "LEC", team: "Ferrari", gap: "+1.209" },
];

export const pitStops: PitStop[] = [
  { driver: "HAM", lap: 39, stationarySeconds: 2.18 },
  { driver: "VER", lap: 38, stationarySeconds: 2.31 },
  { driver: "LEC", lap: 40, stationarySeconds: 2.54 },
];

export const telemetryStats: TelemetryStat[] = [
  { label: "SPEED", value: 312, min: 309, max: 316, unit: "KPH" },
  { label: "ERS", value: 76, min: 72, max: 82, unit: "%" },
  { label: "RPM", value: 11740, min: 11520, max: 11920, unit: "" },
];

export const predictionDriverPool = [
  "Max Verstappen",
  "Lando Norris",
  "Charles Leclerc",
  "Lewis Hamilton",
  "George Russell",
  "Carlos Sainz",
  "Oscar Piastri",
  "Fernando Alonso",
  "Lance Stroll",
  "Liam Lawson",
  "Yuki Tsunoda",
  "Isack Hadjar",
  "Esteban Ocon",
  "Oliver Bearman",
  "Pierre Gasly",
  "Franco Colapinto",
  "Gabriel Bortoleto",
  "Nico Hülkenberg",
];

export const predictionConfig: PredictionConfig = {
  eventName: "Silverstone GP",
  qualifyingAtIso: "2026-03-23T18:00:00.000Z",
  lat: "52.0733 N",
};

export const racePredictions: RacePrediction[] = [
  {
    id: "pred-1",
    username: "@apex_voss",
    fullName: "Alex 'The Apex' Voss",
    createdAt: "14m ago",
    top3: ["Max Verstappen", "Lando Norris", "Charles Leclerc"],
    polePosition: "Max Verstappen",
    driverOfTheDay: "Lewis Hamilton",
    likes: 144,
  },
  {
    id: "pred-2",
    username: "@rossi_inside",
    fullName: "Elena Rossi",
    createdAt: "29m ago",
    top3: ["Charles Leclerc", "Max Verstappen", "Lewis Hamilton"],
    polePosition: "Carlos Sainz",
    driverOfTheDay: "Charles Leclerc",
    likes: 98,
  },
];

export const driverStandings: DriverStanding[] = [
  {
    id: "ver",
    position: 1,
    name: "Max Verstappen",
    team: "Red Bull",
    points: 402,
    avatarUrl:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=900&q=80",
    accent: "#4c6fff",
    telemetryProfile: { aggression: 95, consistency: 90, tech: 88, reaction: 94 },
  },
  {
    id: "ham",
    position: 2,
    name: "Lewis Hamilton",
    team: "Mercedes",
    points: 369,
    avatarUrl:
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=900&q=80",
    accent: "#7ef6ee",
    telemetryProfile: { aggression: 87, consistency: 94, tech: 92, reaction: 91 },
  },
  {
    id: "lec",
    position: 3,
    name: "Charles Leclerc",
    team: "Ferrari",
    points: 341,
    avatarUrl:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=900&q=80",
    accent: "#e10600",
    telemetryProfile: { aggression: 90, consistency: 85, tech: 89, reaction: 90 },
  },
  {
    id: "nor",
    position: 4,
    name: "Lando Norris",
    team: "McLaren",
    points: 318,
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    accent: "#ff9b48",
    telemetryProfile: { aggression: 85, consistency: 88, tech: 86, reaction: 89 },
  },
  {
    id: "rus",
    position: 5,
    name: "George Russell",
    team: "Mercedes",
    points: 286,
    avatarUrl:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
    accent: "#7ef6ee",
    telemetryProfile: { aggression: 81, consistency: 86, tech: 85, reaction: 84 },
  },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Apex Race Jacket",
    price: 189,
    imageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    specs: ["Aero-Drag: Minimal", "Wick Rate: Extreme", "Thermal Map: Active"],
  },
  {
    id: "p2",
    name: "Carbon Pit Gloves",
    price: 129,
    imageUrl:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    specs: ["Grip Index: 9.2", "Weight: 120g", "Heat Shield: Level 4"],
  },
  {
    id: "p3",
    name: "Night Race Cap",
    price: 64,
    imageUrl:
      "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80",
    specs: ["Visor Curve: Track", "Fabric: Carbon Mesh", "Fit: Precision"],
  },
];

export const profileData: ProfileData = {
  name: "Aarav Sharma",
  tag: "ID: #44-VER-2024",
  verified: true,
  rookieYear: 2020,
  points: 1480,
  globalRank: 187,
  recoveryRate: 92,
  sectorVmax: {
    s1: 328,
    s2: 314,
    s3: 336,
  },
  milestones: [
    { year: "2020", title: "Rookie season complete" },
    { year: "2022", title: "Silverstone Pole Position" },
    { year: "2024", title: "Top 250 Global Ranking" },
    { year: "2025", title: "Paddock Analyst Verified" },
  ],
};

export const strategyStints: StrategyStint[] = [
  {
    driver: "HAM",
    compound: "Medium",
    startLap: 1,
    endLap: 17,
    note: "Manage front-left wear in traffic.",
  },
  {
    driver: "HAM",
    compound: "Hard",
    startLap: 18,
    endLap: 44,
    note: "Undercut possible versus VER if gap < 1.1s.",
  },
  {
    driver: "HAM",
    compound: "Soft",
    startLap: 45,
    endLap: 58,
    note: "Attack final stint with high deploy mode.",
  },
];

export const screeningEvents: ScreeningEvent[] = [
  {
    id: "scr-1",
    title: "Bahrain Season Launch Screening",
    city: "Mumbai",
    dateLabel: "Fri 28 Mar // 19:30",
    entryFee: 799,
    venue: "Paddock Dome Arena",
    address: "Hall B, BKC Convention District, Mumbai",
    organiser: "projf1 India",
    details:
      "Opening race night with giant-screen qualifying replay, synchronized telemetry overlays, and post-race analyst panel.",
    foodAndDrinks: ["Energy mocktails", "Trackside sliders", "Vegan pit wraps", "Nitro coffee"],
    availability: ["Live race feed", "Fan zone", "Food counter"],
    foodTiming: "18:30 onwards",
    screeningTiming: "19:30 to race end",
    capacityAllocation: { standard: 130, premium: 50 },
    mapAsset: null,
    houseRules: "Carry valid ID and booking confirmation.",
    contactInfo: "premieres@paddockos.com",
    totalSeats: 180,
    bookedSeats: 121,
  },
  {
    id: "scr-2",
    title: "Jeddah Night Circuit Watch",
    city: "Bengaluru",
    dateLabel: "Sat 05 Apr // 21:00",
    entryFee: 899,
    venue: "Velocity Social Club",
    address: "Indiranagar Motorsport Plaza, Bengaluru",
    organiser: "South Grid Collective",
    details:
      "Street-circuit focused experience featuring race strategy breakdowns and a live fan prediction leaderboard.",
    foodAndDrinks: ["DRS nachos", "Turbo wings", "Craft soda bar", "Dessert pit lane"],
    availability: ["Live race feed", "Commentary", "Food counter"],
    foodTiming: "20:00 onwards",
    screeningTiming: "21:00 to race end",
    capacityAllocation: { standard: 100, premium: 40 },
    mapAsset: null,
    houseRules: "No outside food or beverages.",
    contactInfo: "premieres@paddockos.com",
    totalSeats: 140,
    bookedSeats: 88,
  },
  {
    id: "scr-3",
    title: "Monaco Qualifying Grandstand Night",
    city: "Delhi",
    dateLabel: "Sat 24 May // 18:15",
    entryFee: 1299,
    venue: "Grandstand Studio 1",
    address: "Aerocity Circuit Tower, New Delhi",
    organiser: "Formula Fan Assembly",
    details:
      "Premium qualifying event with immersive race-pace visuals, host commentary, and fan cam reactions.",
    foodAndDrinks: ["Signature pit platters", "Sparkling bar", "Gourmet snack wall", "Coffee sprint cart"],
    availability: ["Live race feed", "Premium lounge", "Food counter"],
    foodTiming: "17:00 onwards",
    screeningTiming: "18:15 to race end",
    capacityAllocation: { standard: 64, premium: 32 },
    mapAsset: null,
    houseRules: "Please arrive 20 minutes before start.",
    contactInfo: "premieres@paddockos.com",
    totalSeats: 96,
    bookedSeats: 67,
  },
  {
    id: "scr-4",
    title: "Silverstone Strategy Session Screening",
    city: "Pune",
    dateLabel: "Sun 13 Jul // 17:45",
    entryFee: 699,
    venue: "The Apex Warehouse",
    address: "Koregaon Motorsport Block, Pune",
    organiser: "Western Racing Community",
    details:
      "Community-first screening with pre-race strategy workshop and live race callout segments.",
    foodAndDrinks: ["Pit box pizza", "Ice tea station", "Protein bowls", "Track popcorn"],
    availability: ["Live race feed", "Workshop", "Food counter"],
    foodTiming: "16:45 onwards",
    screeningTiming: "17:45 to race end",
    capacityAllocation: { standard: 170, premium: 50 },
    mapAsset: null,
    houseRules: "Follow venue safety and queue instructions.",
    contactInfo: "premieres@paddockos.com",
    totalSeats: 220,
    bookedSeats: 146,
  },
];

export const raceCalendar: RaceWeekend[] = [
  {
    id: "r1",
    name: "Australian Grand Prix",
    circuit: "Albert Park Circuit",
    city: "Melbourne",
    country: "Australia",
    flagEmoji: "🇦🇺",
    fp1Iso: "2026-03-13T01:30:00.000Z",
    qualifyingIso: "2026-03-14T06:00:00.000Z",
    raceIso: "2026-03-15T05:00:00.000Z",
    round: 1,
    totalRounds: 24,
  },
  {
    id: "r2",
    name: "Chinese Grand Prix",
    circuit: "Shanghai International Circuit",
    city: "Shanghai",
    country: "China",
    flagEmoji: "🇨🇳",
    fp1Iso: "2026-03-27T03:30:00.000Z",
    qualifyingIso: "2026-03-28T07:00:00.000Z",
    raceIso: "2026-03-29T07:00:00.000Z",
    round: 2,
    totalRounds: 24,
  },
  {
    id: "r3",
    name: "Japanese Grand Prix",
    circuit: "Suzuka International Racing Course",
    city: "Suzuka",
    country: "Japan",
    flagEmoji: "🇯🇵",
    fp1Iso: "2026-04-03T02:30:00.000Z",
    qualifyingIso: "2026-04-04T06:00:00.000Z",
    raceIso: "2026-04-05T06:00:00.000Z",
    round: 3,
    totalRounds: 24,
  },
  {
    id: "r4",
    name: "Bahrain Grand Prix",
    circuit: "Bahrain International Circuit",
    city: "Sakhir",
    country: "Bahrain",
    flagEmoji: "🇧🇭",
    fp1Iso: "2026-04-10T11:30:00.000Z",
    qualifyingIso: "2026-04-11T15:00:00.000Z",
    raceIso: "2026-04-12T15:00:00.000Z",
    round: 4,
    totalRounds: 24,
  },
  {
    id: "r5",
    name: "Saudi Arabian Grand Prix",
    circuit: "Jeddah Corniche Circuit",
    city: "Jeddah",
    country: "Saudi Arabia",
    flagEmoji: "🇸🇦",
    fp1Iso: "2026-04-17T13:30:00.000Z",
    qualifyingIso: "2026-04-18T17:00:00.000Z",
    raceIso: "2026-04-19T17:00:00.000Z",
    round: 5,
    totalRounds: 24,
  },
  {
    id: "r6",
    name: "Miami Grand Prix",
    circuit: "Miami International Autodrome",
    city: "Miami",
    country: "United States",
    flagEmoji: "🇺🇸",
    fp1Iso: "2026-04-24T16:30:00.000Z",
    qualifyingIso: "2026-04-25T20:00:00.000Z",
    raceIso: "2026-04-26T20:00:00.000Z",
    round: 6,
    totalRounds: 24,
  },
];

export const pitWallThreads: PitWallThread[] = [
  {
    id: "pw1",
    title: "DRS Delta Audit",
    summary: "Thread on sector 3 slipstream calibration and flap timing.",
    participants: 32,
    updatedAt: "2m ago",
    urgency: "high",
  },
  {
    id: "pw2",
    title: "Weather Degradation Window",
    summary: "Rain probability climbed to 24% for final 12 laps.",
    participants: 19,
    updatedAt: "9m ago",
    urgency: "normal",
  },
  {
    id: "pw3",
    title: "Pit Entry Loss Review",
    summary: "Comparing entry line losses between VER and HAM pit boxes.",
    participants: 26,
    updatedAt: "15m ago",
    urgency: "normal",
  },
];
