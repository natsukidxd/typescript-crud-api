import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import config from "../../config.json";

type AuthPayload = {
  sub: number;
  role: string;
};

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    res.status(401).json({ error: "Missing authorization token" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (typeof decoded !== "object" || decoded === null) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    const sub = (decoded as jwt.JwtPayload).sub;
    const role = (decoded as jwt.JwtPayload).role;
    const userId = typeof sub === "string" ? Number(sub) : Number(sub);

    if (!Number.isFinite(userId) || !role) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    res.locals.auth = { sub: userId, role: String(role) } satisfies AuthPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const role = String(res.locals.auth?.role || "");
  if (role.toLowerCase() !== "admin") {
    res.status(403).json({ error: "Admin access only" });
    return;
  }
  next();
}
