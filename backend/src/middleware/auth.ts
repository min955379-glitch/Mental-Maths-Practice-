import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env";

export interface AuthRequest extends Request {
  userId?: string;
}

export function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = header.substring(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authOptional(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.substring(7);
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
    } catch {
      // ignore
    }
  }
  next();
}
