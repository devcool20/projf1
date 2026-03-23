export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export type Team = {
  id: string;
  name: string;
  accent: string;
};

export type Transcript = {
  id: string;
  author: string;
  handle: string;
  teamId: string;
  channel: string;
  timestamp: string;
  message: string;
  likes: number;
  comments: number;
  mediaUrl?: string;
  severity?: "normal" | "warning";
};

export type CommReply = {
  id: string;
  username: string;
  fullName: string;
  message: string;
  imageUrl?: string;
  likes: number;
  createdAt: string;
  replies: CommReply[];
};

export type CommThread = {
  id: string;
  username: string;
  fullName: string;
  message: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  createdAt: string;
  replies: CommReply[];
};

export type LiveStanding = {
  position: number;
  driver: string;
  team: string;
  gap: string;
};

export type PitStop = {
  driver: string;
  lap: number;
  stationarySeconds: number;
};

export type TelemetryStat = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
};

export type RacePrediction = {
  id: string;
  username: string;
  fullName: string;
  createdAt: string;
  top3: [string, string, string];
  polePosition: string;
  driverOfTheDay: string;
  likes: number;
};

export type PredictionConfig = {
  eventName: string;
  qualifyingAtIso: string;
  lat: string;
};

export type DriverStanding = {
  id: string;
  position: number;
  name: string;
  team: string;
  points: number;
  avatarUrl: string;
  accent: string;
  telemetryProfile: {
    aggression: number;
    consistency: number;
    tech: number;
    reaction: number;
  };
};

export type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  specs: string[];
};

export type ProfileData = {
  name: string;
  tag: string;
  verified: boolean;
  rookieYear: number;
  points: number;
  globalRank: number;
  recoveryRate: number;
  sectorVmax: {
    s1: number;
    s2: number;
    s3: number;
  };
  milestones: { year: string; title: string }[];
};

export type StrategyStint = {
  driver: string;
  compound: "Soft" | "Medium" | "Hard";
  startLap: number;
  endLap: number;
  note: string;
};

export type ScreeningEvent = {
  id: string;
  title: string;
  city: string;
  dateLabel: string;
  entryFee: number;
  venue: string;
  address: string;
  organiser: string;
  details: string;
  foodAndDrinks: string[];
  totalSeats: number;
  bookedSeats: number;
};

export type ApiDriverStanding = {
  position: number;
  driverName: string;
  driverCode: string;
  nationality: string;
  teamName: string;
  points: number;
};

export type ApiTeamStanding = {
  position: number;
  teamName: string;
  points: number;
};

export type StandingsApiResponse<T> = {
  success: boolean;
  meta: {
    season: number;
    fetchedAt: string;
    stale: boolean;
    rowCount: number;
  };
  data: T[];
};

export type RaceWeekend = {
  id: string;
  name: string;
  circuit: string;
  city: string;
  country: string;
  flagEmoji: string;
  fp1Iso: string;
  qualifyingIso: string;
  raceIso: string;
  round: number;
  totalRounds: number;
};

export type PitWallThread = {
  id: string;
  title: string;
  summary: string;
  participants: number;
  updatedAt: string;
  urgency: "normal" | "high";
};
