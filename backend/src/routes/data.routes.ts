import { Router, Response } from "express";
import { AuthRequest, authRequired } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { generateCoachAdvice } from "../services/coach.service";

export const dataRouter = Router();

dataRouter.get("/categories", async (_req, res: Response) => {
  const cats = await prisma.category.findMany({ orderBy: { displayOrder: "asc" } });
  res.json(cats);
});

dataRouter.get("/patterns", async (_req, res: Response) => {
  const patterns = await prisma.mentalPattern.findMany({ orderBy: { createdAt: "asc" } });
  const out = patterns.map((p) => ({
    ...p,
    examples: JSON.parse(p.examples),
  }));
  res.json(out);
});

dataRouter.get("/dashboard", authRequired, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const [totalSessions, completedSessions, attempts, performances, recentSessions, daily] = await Promise.all([
    prisma.quizSession.count({ where: { userId } }),
    prisma.quizSession.count({ where: { userId, status: "completed" } }),
    prisma.questionAttempt.findMany({
      where: { userId },
      orderBy: { attemptedAt: "desc" },
      take: 500,
      select: { isCorrect: true, responseTimeMs: true, attemptedAt: true },
    }),
    prisma.userPerformance.findMany({
      where: { userId, questionsAttempted: { gte: 1 } },
      include: { category: true },
    }),
    prisma.quizSession.findMany({
      where: { userId, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.dailyProgress.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;
  const avgTime = totalAttempts > 0
    ? attempts.reduce((s, a) => s + a.responseTimeMs, 0) / totalAttempts
    : 0;
  const fastestTime = totalAttempts > 0
    ? Math.min(...attempts.map((a) => a.responseTimeMs))
    : 0;

  // Streak: count consecutive days from today backward with at least 1 question
  const today = new Date().toISOString().slice(0, 10);
  const dayMap = new Set(daily.map((d) => d.date));
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const d = cursor.toISOString().slice(0, 10);
    if (dayMap.has(d)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (d === today) {
      // allow today missing
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
    if (streak > 365) break;
  }

  // Best score
  const bestScore = recentSessions.reduce((max, s) => Math.max(max, s.score || 0), 0);

  // Performance label
  let performanceLabel = "Needs Practice";
  if (accuracy >= 0.9 && avgTime < 5000) performanceLabel = "Elite";
  else if (accuracy >= 0.8 && avgTime < 7000) performanceLabel = "Strong";
  else if (accuracy >= 0.7) performanceLabel = "Good";
  else if (accuracy >= 0.5) performanceLabel = "Improving";

  res.json({
    totals: {
      totalSessions,
      completedSessions,
      questionsSolved: totalAttempts,
      accuracy,
      averageResponseTimeMs: avgTime,
      fastestResponseTimeMs: fastestTime,
      bestScore,
      streak,
      performanceLabel,
    },
    categories: performances.map((p) => ({
      id: p.categoryId,
      name: p.category.name,
      slug: p.category.slug,
      accuracy: p.accuracy,
      averageResponseTime: p.averageResponseTime,
      questionsAttempted: p.questionsAttempted,
      questionsCorrect: p.questionsCorrect,
    })),
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      mode: s.mode,
      total: s.totalQuestions,
      correct: s.correctAnswers,
      incorrect: s.incorrectAnswers,
      score: s.score,
      averageTimeMs: s.correctAnswers + s.incorrectAnswers > 0
        ? Math.round(s.totalResponseTimeMs / (s.correctAnswers + s.incorrectAnswers))
        : 0,
      completedAt: s.completedAt,
    })),
    daily: daily.map((d) => ({
      date: d.date,
      questionsSolved: d.questionsSolved,
      correctAnswers: d.correctAnswers,
    })),
  });
});

dataRouter.get("/coach", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const advice = await generateCoachAdvice(req.userId!);
    res.json(advice);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to generate advice" });
  }
});

dataRouter.get("/history", authRequired, async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.quizSession.findMany({
    where: { userId: req.userId!, status: "completed" },
    orderBy: { completedAt: "desc" },
    take: 50,
  });
  res.json(sessions);
});
