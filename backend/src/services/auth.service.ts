import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";

export class AuthError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
  }
}

export async function registerUser(email: string, username: string, password: string) {
  if (!email || !username || !password) {
    throw new AuthError("Email, username, and password are required");
  }
  if (password.length < 6) {
    throw new AuthError("Password must be at least 6 characters");
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    throw new AuthError("Invalid email format");
  }
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    if (existing.email === email) throw new AuthError("Email already registered");
    throw new AuthError("Username already taken");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
    select: { id: true, email: true, username: true, createdAt: true },
  });
  const token = signToken(user.id);
  return { user, token };
}

export async function loginUser(emailOrUsername: string, password: string) {
  if (!emailOrUsername || !password) {
    throw new AuthError("Email/username and password required");
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
  });
  if (!user) throw new AuthError("Invalid credentials");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AuthError("Invalid credentials");
  const token = signToken(user.id);
  return {
    user: { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt },
    token,
  };
}

function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}
