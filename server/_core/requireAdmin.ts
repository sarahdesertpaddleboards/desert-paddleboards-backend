// server/_core/requireAdmin.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.adminToken;
    if (!token) return res.status(401).json({ error: "Admin authentication required" });

    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    if (!payload) return res.status(401).json({ error: "Invalid token" });

    next();
  } catch (err) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
}
