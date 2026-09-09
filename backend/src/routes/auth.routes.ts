import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest, authRequired } from "../middleware/auth";
import { registerUser, loginUser, AuthError } from "../services/auth.service";
import { prisma } from "../lib/prisma";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Username must be alphanumeric or underscore"),
  password: z.string().min(6),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/register", async (req, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await registerUser(body.email, body.username, body.password);
    res.json(result);
  } catch (e: any) {
    if (e instanceof AuthError) return res.status(400).json({ error: e.message });
    if (e.issues) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await loginUser(body.emailOrUsername, body.password);
    res.json(result);
  } catch (e: any) {
    if (e instanceof AuthError) return res.status(400).json({ error: e.message });
    if (e.issues) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.get("/me", authRequired, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, username: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});
