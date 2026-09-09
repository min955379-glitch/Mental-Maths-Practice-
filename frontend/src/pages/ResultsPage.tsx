import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Clock, Zap, Target, CheckCircle2, XCircle, RefreshCw, ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Button, Badge, Spinner, ProgressBar, EmptyState } from "@/components/ui";

export function ResultsPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    api.getResults(sessionId).then(setData).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <EmptyState title="No results found" />;

  const fastest = data.fastestResponseTimeMs ? (data.fastestResponseTimeMs / 1000).toFixed(1) + "s" : "—";
  const avgTime = (data.averageResponseTimeMs / 1000).toFixed(1) + "s";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/")} icon={<ArrowLeft className="w-4 h-4" />}>
          Back to dashboard
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card elevated className="p-8 sm:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 mx-auto flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-sm uppercase tracking-wider text-slate-500 dark:text-navy-400 font-medium">Test complete</div>
          <div className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-navy-50 mt-2 tabular-nums">
            {data.correct}<span className="text-slate-300 dark:text-navy-700">/</span>{data.total}
          </div>
          <div className="text-lg text-slate-600 dark:text-navy-300 mt-1">Score: {data.score}%</div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Badge variant="primary" className="capitalize">{data.mode}</Badge>
            <Badge variant={data.score >= 80 ? "success" : data.score >= 60 ? "primary" : "danger"}>
              {data.score >= 90 ? "Elite" : data.score >= 80 ? "Strong" : data.score >= 70 ? "Good" : data.score >= 50 ? "Improving" : "Needs Practice"}
            </Badge>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric icon={CheckCircle2} label="Correct" value={data.correct} color="emerald" />
        <Metric icon={XCircle} label="Incorrect" value={data.incorrect} color="red" />
        <Metric icon={Clock} label="Avg time" value={avgTime} color="indigo" />
        <Metric icon={Zap} label="Fastest" value={fastest} color="amber" />
      </div>

      {data.categoryBreakdown.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-4">Category performance</h2>
          <div className="space-y-3">
            {data.categoryBreakdown.map((c: any) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-700 dark:text-navy-200 font-medium">{c.name}</span>
                  <span className="text-slate-500 dark:text-navy-400 tabular-nums">
                    {Math.round(c.accuracy * 100)}% · {c.correct}/{c.total}
                  </span>
                </div>
                <ProgressBar value={c.accuracy * 100} max={100} color={c.accuracy >= 0.8 ? "emerald" : c.accuracy >= 0.6 ? "indigo" : "amber"} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {data.questionsToReview.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-navy-50">Questions to review</h2>
            <Badge variant="danger">{data.questionsToReview.length} incorrect</Badge>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-navy-800">
            {data.questionsToReview.map((q: any, i: number) => (
              <details key={i} className="py-3 group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-1" />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-900 dark:text-navy-50 truncate">{q.text}</div>
                      <div className="text-xs text-slate-500 dark:text-navy-400 mt-0.5">
                        Your answer: <span className="font-medium text-red-600 dark:text-red-400">{q.userAnswer || "—"}</span> · Correct: <span className="font-medium text-emerald-600 dark:text-emerald-400">{q.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-4 ml-7 space-y-3">
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                    <div className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1">Fast mental trick</div>
                    <div className="text-sm text-slate-700 dark:text-navy-200 whitespace-pre-line">{q.shortcut}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30">
                    <div className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider mb-1">Why it works</div>
                    <div className="text-sm text-slate-700 dark:text-navy-200">{q.explanation}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30">
                    <div className="text-xs font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1">Mental pattern</div>
                    <div className="text-sm italic text-slate-700 dark:text-navy-200">{q.mentalPattern}</div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link to="/practice" className="btn-primary size-lg">
          <RefreshCw className="w-4 h-4" />
          Practice again
        </Link>
        <Link to="/" className="btn-secondary size-lg">
          <BookOpen className="w-4 h-4" />
          View patterns
        </Link>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: "emerald" | "red" | "indigo" | "amber" }) {
  const colorClass = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
  }[color];
  return (
    <Card className="p-4">
      <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center mb-2", colorClass)}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-navy-400 font-medium">{label}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-navy-50 mt-1">{value}</div>
    </Card>
  );
}

function clsx(...args: any[]) {
  return args.filter(Boolean).join(" ");
}
