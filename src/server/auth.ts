import { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers["x-password"];
  const password = typeof header === "string" ? header : "";

  if (!config.password) {
    return next();
  }

  if (password === config.password) {
    return next();
  }

  res.status(401).json({ error: "Unauthorized" });
}
