import dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  JWT_SECRET: process.env.JWT_SECRET || "dev-only-change-in-prod-please-use-a-strong-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
};
