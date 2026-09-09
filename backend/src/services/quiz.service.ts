import { prisma } from "../lib/prisma";
import { isAnswerCorrect } from "../utils/normalize";

type Mode = "quick" | "timed" | "full" | "category" | "weak" | "mistake";

const MODE_DEFAULTS: Record<Mode, number> = {
  quick: 10,
  timed: 20,
  full: 50,
  category: 15,
  weak: 15,
  mistake: 10,
};

const DIFFICULTY_DISTRIBUTION: Record<string, Record<string, number>> = {
  full: { Easy: 10, Medium: 25, Hard: 12, Expert: 3 },
  timed: { Easy: 5, Medium: 8, Hard: 5, Expert: 2 },
  quick: { Easy: 5, Medium: 4, Hard: 1, Expert: 0 },
  category: { Easy: 5, Medium: 6, Hard: 3, Expert: 1 },
  weak: { Easy: 3, Medium: 5, Hard: 5, Expert: 2 },
  mistake: { Easy: 3, Medium: 4, Hard: 2, Expert: 1 },
};

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function distributeByDifficulty(
  pool: { id: string; difficulty: string }[],
  counts: Record<string, number>
) {
  const result: string[] = [];
  for (const [diff, count] of Object.entries(counts)) {
    if (count <= 0) continue;
    const candidates = pool.filter((q) => q.difficulty === diff);
    result.push(...pickRandom(candidates, count).map((q) => q.id));
  }
  return result;
}

export interface StartSessionInput {
  userId: string;
  mode: Mode;
  categorySlug?: string;
  timerSeconds?: number;
}

export async function startQuizSession(input: StartSessionInput) {
  const { userId, mode, categorySlug } = input;
  const total = MODE_DEFAULTS[mode] || 10;
  const dist = DIFFICULTY_DISTRIBUTION[mode] || DIFFICULTY_DISTRIBUTION.quick;

  // Build candidate pool
  let pool: { id: string; difficulty: string }[] = [];
  const filter: any = {};
  if (categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (cat) filter.categoryId = cat.id;
  }

  if (mode === "mistake") {
    // Find previously incorrect question IDs for this user
    const wrongAttempts = await prisma.questionAttempt.findMany({
      where: { userId, isCorrect: false },
      select: { questionId: true },
    });
    const wrongIds = Array.from(new Set(wrongAttempts.map((a) => a.questionId)));
    if (wrongIds.length > 0) {
      const wrongQuestions = await prisma.question.findMany({
        where: { id: { in: wrongIds } },
        select: { id: true, difficulty: true },
      });
      const ids = distributeByDifficulty(wrongQuestions, dist);
      if (ids.length > 0) {
        pool = wrongQuestions.filter((q) => ids.includes(q.id));
      } else {
        pool = wrongQuestions;
      }
    }
    // If no mistakes, fall through to all
    if (pool.length === 0) {
      const all = await prisma.question.findMany({
        where: filter,
        select: { id: true, difficulty: true },
      });
      pool = all;
    }
  } else if (mode === "weak") {
    // Find categories with lowest accuracy
    const perfs = await prisma.userPerformance.findMany({
      where: { userId, questionsAttempted: { gte: 3 } },
      include: { category: true },
    });
    const weakCats = perfs
      .filter((p) => p.accuracy < 0.75)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);
    if (weakCats.length > 0) {
      const ids = weakCats.map((c) => c.categoryId);
      const weakQuestions = await prisma.question.findMany({
        where: { categoryId: { in: ids } },
        select: { id: true, difficulty: true },
      });
      pool = weakQuestions;
    } else {
      // No weak data; pick from all
      const all = await prisma.question.findMany({
        where: filter,
        select: { id: true, difficulty: true },
      });
      pool = all;
    }
  } else {
    const all = await prisma.question.findMany({
      where: filter,
      select: { id: true, difficulty: true },
    });
    pool = all;
  }

  if (pool.length === 0) {
    throw new Error("No questions available for the selected criteria");
  }

  // Distribute and pick
  const distributed = distributeByDifficulty(pool, dist);
  let questionIds = distributed;
  if (questionIds.length === 0) {
    // Fallback: random sample
    questionIds = pickRandom(pool, Math.min(total, pool.length)).map((q) => q.id);
  }
  // Trim to total
  questionIds = questionIds.slice(0, total);
  if (questionIds.length < total) {
    // Top up with more random picks
    const remaining = pool.filter((q) => !questionIds.includes(q.id));
    const extra = pickRandom(remaining, total - questionIds.length);
    questionIds = questionIds.concat(extra.map((q) => q.id));
  }

  // Create session
  const session = await prisma.quizSession.create({
    data: {
      userId,
      mode,
      categoryFilter: categorySlug || null,
      totalQuestions: questionIds.length,
      timerSeconds: input.timerSeconds || null,
    },
  });

  // Create quiz questions
  for (let i = 0; i < questionIds.length; i++) {
    await prisma.quizQuestion.create({
      data: {
        sessionId: session.id,
        questionId: questionIds[i],
        order: i,
      },
    });
  }

  return session;
}

export async function getNextQuestion(sessionId: string, userId: string) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");
  if (session.status === "completed") throw new Error("Session already completed");

  const next = await prisma.quizQuestion.findFirst({
    where: { sessionId, answeredAt: null },
    orderBy: { order: "asc" },
    include: {
      question: { include: { category: true } },
    },
  });
  if (!next) return null;

  return {
    sessionId: session.id,
    position: next.order + 1,
    total: session.totalQuestions,
    mode: session.mode,
    timerSeconds: session.timerSeconds,
    question: {
      id: next.question.id,
      text: next.question.text,
      unit: next.question.unit,
      category: next.question.category.name,
      difficulty: next.question.difficulty,
    },
  };
}

export async function submitAnswer(
  sessionId: string,
  userId: string,
  questionId: string,
  userAnswer: string,
  responseTimeMs: number
) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");
  if (session.status === "completed") throw new Error("Session already completed");

  const qq = await prisma.quizQuestion.findFirst({
    where: { sessionId, questionId, answeredAt: null },
  });
  if (!qq) throw new Error("Question not found or already answered");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { category: true },
  });
  if (!question) throw new Error("Question missing");

  const result = isAnswerCorrect(userAnswer, question.correctAnswer, question.acceptedAnswers, question.unit);
  const isCorrect = result.isCorrect;

  // Update quiz question
  await prisma.quizQuestion.update({
    where: { id: qq.id },
    data: {
      userAnswer,
      isCorrect,
      responseTimeMs,
      answeredAt: new Date(),
    },
  });

  // Create attempt
  await prisma.questionAttempt.create({
    data: {
      userId,
      questionId,
      quizSessionId: sessionId,
      userAnswer,
      isCorrect,
      responseTimeMs,
    },
  });

  // Update session aggregates
  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      correctAnswers: { increment: isCorrect ? 1 : 0 },
      incorrectAnswers: { increment: isCorrect ? 0 : 1 },
      totalResponseTimeMs: { increment: responseTimeMs },
    },
  });

  // Update user performance per category
  await updatePerformance(userId, question.categoryId, isCorrect, responseTimeMs);

  // Update daily progress
  await updateDailyProgress(userId, isCorrect, responseTimeMs);

  return {
    isCorrect,
    correctAnswer: question.correctAnswer,
    userAnswer,
    explanation: question.explanation,
    shortcut: question.shortcut,
    mentalPattern: question.mentalPattern,
    commonMistake: question.commonMistake,
    acceptedAnswers: JSON.parse(question.acceptedAnswers),
    unit: question.unit,
  };
}

async function updatePerformance(userId: string, categoryId: string, isCorrect: boolean, responseTimeMs: number) {
  const existing = await prisma.userPerformance.findUnique({
    where: { userId_categoryId: { userId, categoryId } },
  });
  if (!existing) {
    await prisma.userPerformance.create({
      data: {
        userId,
        categoryId,
        questionsAttempted: 1,
        questionsCorrect: isCorrect ? 1 : 0,
        totalResponseTimeMs: responseTimeMs,
        accuracy: isCorrect ? 1 : 0,
        averageResponseTime: responseTimeMs,
      },
    });
  } else {
    const newAttempted = existing.questionsAttempted + 1;
    const newCorrect = existing.questionsCorrect + (isCorrect ? 1 : 0);
    const newTotalTime = existing.totalResponseTimeMs + responseTimeMs;
    await prisma.userPerformance.update({
      where: { userId_categoryId: { userId, categoryId } },
      data: {
        questionsAttempted: newAttempted,
        questionsCorrect: newCorrect,
        totalResponseTimeMs: newTotalTime,
        accuracy: newCorrect / newAttempted,
        averageResponseTime: newTotalTime / newAttempted,
      },
    });
  }
}

async function updateDailyProgress(userId: string, isCorrect: boolean, responseTimeMs: number) {
  const date = new Date().toISOString().slice(0, 10);
  const existing = await prisma.dailyProgress.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (!existing) {
    await prisma.dailyProgress.create({
      data: {
        userId,
        date,
        questionsSolved: 1,
        correctAnswers: isCorrect ? 1 : 0,
        totalTimeSec: Math.round(responseTimeMs / 1000),
        sessionsCount: 0,
      },
    });
  } else {
    await prisma.dailyProgress.update({
      where: { userId_date: { userId, date } },
      data: {
        questionsSolved: { increment: 1 },
        correctAnswers: { increment: isCorrect ? 1 : 0 },
        totalTimeSec: { increment: Math.round(responseTimeMs / 1000) },
      },
    });
  }
}

export async function completeSession(sessionId: string, userId: string) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");
  if (session.status === "completed") return session;

  const totalAnswered = session.correctAnswers + session.incorrectAnswers;
  const score = totalAnswered > 0 ? Math.round((session.correctAnswers / totalAnswered) * 100) : 0;
  const avgTime = totalAnswered > 0 ? Math.round(session.totalResponseTimeMs / totalAnswered) : 0;

  return prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      completedAt: new Date(),
      score,
    },
  });
}

export async function getSessionResults(sessionId: string, userId: string) {
  const session = await prisma.quizSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error("Session not found");

  const allQ = await prisma.quizQuestion.findMany({
    where: { sessionId },
    orderBy: { order: "asc" },
    include: { question: { include: { category: true } } },
  });

  // Category breakdown
  const byCat: Record<string, { name: string; total: number; correct: number; accuracy: number }> = {};
  let fastest = Infinity;
  for (const qq of allQ) {
    if (qq.isCorrect === null) continue;
    const catName = qq.question.category.name;
    if (!byCat[catName]) byCat[catName] = { name: catName, total: 0, correct: 0, accuracy: 0 };
    byCat[catName].total += 1;
    if (qq.isCorrect) byCat[catName].correct += 1;
    if (qq.responseTimeMs && qq.responseTimeMs < fastest) fastest = qq.responseTimeMs;
  }
  for (const c of Object.values(byCat)) c.accuracy = c.total > 0 ? c.correct / c.total : 0;

  const wrongQuestions = allQ
    .filter((qq) => qq.isCorrect === false)
    .map((qq) => ({
      questionId: qq.questionId,
      text: qq.question.text,
      userAnswer: qq.userAnswer,
      correctAnswer: qq.question.correctAnswer,
      shortcut: qq.question.shortcut,
      explanation: qq.question.explanation,
      mentalPattern: qq.question.mentalPattern,
      commonMistake: qq.question.commonMistake,
      category: qq.question.category.name,
    }));

  const totalAnswered = session.correctAnswers + session.incorrectAnswers;
  const avgTime = totalAnswered > 0 ? Math.round(session.totalResponseTimeMs / totalAnswered) : 0;

  return {
    sessionId: session.id,
    mode: session.mode,
    total: session.totalQuestions,
    correct: session.correctAnswers,
    incorrect: session.incorrectAnswers,
    score: session.score,
    averageResponseTimeMs: avgTime,
    fastestResponseTimeMs: fastest === Infinity ? null : fastest,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    categoryBreakdown: Object.values(byCat),
    questionsToReview: wrongQuestions,
  };
}
