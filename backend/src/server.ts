import express from "express";
import cors from "cors";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth.routes";
import { quizRouter } from "./routes/quiz.routes";
import { dataRouter } from "./routes/data.routes";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "ISCSP Mental Math AI Arena API" });
});

app.use("/api/auth", authRouter);
app.use("/api/quiz", quizRouter);
app.use("/api", dataRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.PORT, "0.0.0.0", () => {
  console.log(`ISCSP Mental Math AI Arena API running on http://0.0.0.0:${env.PORT}`);
});
