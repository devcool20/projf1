import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "../config.js";

export const corsMiddleware = cors({
  origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
  methods: ["GET", "POST"],
});

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({ success: false, error: "Rate limit exceeded. Try again in 1 minute." });
    return;
  }

  next();
}

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"];
  if (key !== config.apiKey) {
    res.status(401).json({ success: false, error: "Invalid or missing API key" });
    return;
  }
  next();
}
