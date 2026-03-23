import { z } from "zod";

export const driverStandingSchema = z.object({
  position: z.number().int().positive(),
  driverName: z.string().min(1),
  driverCode: z.string().length(3),
  nationality: z.string().min(2),
  teamName: z.string().min(1),
  points: z.number().int().min(0),
  season: z.number().int(),
});

export const teamStandingSchema = z.object({
  position: z.number().int().positive(),
  teamName: z.string().min(1),
  points: z.number().int().min(0),
  season: z.number().int(),
});

export type DriverStanding = z.infer<typeof driverStandingSchema>;
export type TeamStanding = z.infer<typeof teamStandingSchema>;
