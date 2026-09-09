import { prisma } from "../lib/prisma";

export interface CoachAdvice {
  summary: string;
  strong: string[];
  weak: string[];
  tips: string[];
  recommendedCategories: string[];
  overallAccuracy: number;
  overallAvgTime: number;
  questionsAttempted: number;
}

export async function generateCoachAdvice(userId: string): Promise<CoachAdvice> {
  const perfs = await prisma.userPerformance.findMany({
    where: { userId, questionsAttempted: { gte: 3 } },
    include: { category: true },
  });

  const overall = await prisma.questionAttempt.aggregate({
    where: { userId },
    _count: { _all: true },
    _avg: { responseTimeMs: true },
  });
  const correctOverall = await prisma.questionAttempt.count({
    where: { userId, isCorrect: true },
  });
  const totalAttempts = overall._count._all;
  const overallAccuracy = totalAttempts > 0 ? correctOverall / totalAttempts : 0;
  const overallAvgTime = overall._avg.responseTimeMs || 0;

  // Sort by accuracy to find strong/weak
  const sorted = [...perfs].sort((a, b) => b.accuracy - a.accuracy);
  const strong = sorted.filter((p) => p.accuracy >= 0.85).slice(0, 3);
  const weak = sorted.filter((p) => p.accuracy < 0.75).slice(0, 3);

  // Identify slow categories
  const slow = [...perfs]
    .filter((p) => p.averageResponseTime > overallAvgTime + 2000)
    .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
    .slice(0, 3);

  const tips: string[] = [];
  if (totalAttempts === 0) {
    tips.push("Start with Quick Practice to build a foundation.");
    tips.push("Focus on mental shortcuts — speed comes from patterns, not arithmetic.");
  } else {
    if (overallAccuracy >= 0.85 && overallAvgTime < 5000) {
      tips.push("You are performing at an advanced level. Push yourself with Expert difficulty questions.");
    } else if (overallAccuracy >= 0.7) {
      tips.push("Your accuracy is solid. Now prioritize reducing response time on familiar categories.");
    } else {
      tips.push("Focus on accuracy first. Slow down and use mental shortcuts consistently.");
    }
    if (slow.length > 0) {
      tips.push(
        `Your response time in ${slow.map((s) => s.category.name).join(", ")} is slower than your average. Practice these to build speed.`
      );
    }
    if (weak.length > 0) {
      tips.push(
        `Prioritize ${weak.map((w) => w.category.name).join(", ")}. Aim for 10 questions in each weak area today.`
      );
    }
  }

  const recommendedCategories = weak.length > 0 ? weak.map((w) => w.category.name) : strong.length > 0 ? strong.map((s) => s.category.name) : [];

  let summary = "";
  if (totalAttempts === 0) {
    summary = "No data yet. Start practicing to receive personalized coaching.";
  } else if (overallAccuracy >= 0.85) {
    summary = "Strong performance across the board. Maintain consistency and refine weak spots.";
  } else if (overallAccuracy >= 0.7) {
    summary = "Good progress. Focus on weak categories and reduce response time.";
  } else {
    summary = "Keep practicing. Accuracy improves fastest with daily focused sessions.";
  }

  return {
    summary,
    strong: strong.map((s) => s.category.name),
    weak: weak.map((w) => w.category.name),
    tips,
    recommendedCategories,
    overallAccuracy,
    overallAvgTime,
    questionsAttempted: totalAttempts,
  };
}
