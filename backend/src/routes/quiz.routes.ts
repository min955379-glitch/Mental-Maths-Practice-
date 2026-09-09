import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest, authRequired } from "../middleware/auth";
import {
  startQuizSession,
  getNextQuestion,
  submitAnswer,
  completeSession,
  getSessionResults,
} from "../services/quiz.service";
import { generateAndStoreQuestion } from "../services/ai.service";

export const quizRouter = Router();

const startSchema = z.object({
  mode: z.enum(["quick", "timed", "full", "category", "weak", "mistake"]),
  categorySlug: z.string().optional(),
  timerSeconds: z.number().int().positive().optional(),
});

const submitSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  userAnswer: z.string(),
  responseTimeMs: z.number().int().nonnegative(),
});

quizRouter.post("/start", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = startSchema.parse(req.body);
    const session = await startQuizSession({ userId: req.userId!, ...body });
    res.json({ sessionId: session.id, mode: session.mode, total: session.totalQuestions });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to start session" });
  }
});

quizRouter.get("/:sessionId/next", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = await getNextQuestion(req.params.sessionId, req.userId!);
    if (!data) {
      await completeSession(req.params.sessionId, req.userId!);
      return res.json({ finished: true });
    }
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to get next question" });
  }
});

quizRouter.post("/submit", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = submitSchema.parse(req.body);
    const result = await submitAnswer(
      body.sessionId,
      req.userId!,
      body.questionId,
      body.userAnswer,
      body.responseTimeMs
    );
    res.json(result);
  } catch (e: any) {
    if (e.issues) return res.status(400).json({ error: e.issues[0]?.message || "Invalid input" });
    res.status(400).json({ error: e.message || "Failed to submit answer" });
  }
});

quizRouter.post("/:sessionId/complete", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const session = await completeSession(req.params.sessionId, req.userId!);
    res.json({ sessionId: session.id, status: session.status, score: session.score });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to complete session" });
  }
});

quizRouter.get("/:sessionId/results", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = await getSessionResults(req.params.sessionId, req.userId!);
    res.json(data);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to get results" });
  }
});

const generateSchema = z.object({
  categorySlug: z.string().optional(),
});

quizRouter.post("/generate", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const body = generateSchema.parse(req.body || {});
    const q = await generateAndStoreQuestion(body.categorySlug);
    res.json({
      id: q.id,
      text: q.text,
      unit: q.unit,
      category: q.category.name,
      difficulty: q.difficulty,
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Failed to generate question" });
  }
});
