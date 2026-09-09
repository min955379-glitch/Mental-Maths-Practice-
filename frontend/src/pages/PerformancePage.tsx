import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Clock, Target, Zap, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Spinner, EmptyState, ProgressBar } from "@/components/ui";

export function PerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return <EmptyState title="No data" />;

  const t = data.totals;
  const accuracyPct = Math.round(t.accuracy * 100);
  const avgTime = (t.averageResponseTimeMs / 1000).toFixed(1);
  const fastest = t.fastestResponseTimeMs > 0 ? (t.fastestResponseTimeMs / 1000).toFixed(1) + "s" : "—";

  // Sort categories by accuracy
  const cats = [...data.categories].sort((a, b) => a.accuracy - b.accuracy);
  const weak = cats.filter((c) => c.accuracy < 0.75).slice(0, 5);
  const strong = [...cats].reverse().filter((c) => c.accuracy >= 0.75).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-navy-50">Performance</h1>
        <p className="text-slate-500 dark:text-navy-400 mt-1">Track your mental math progress across all categories.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={Target} label="Accuracy" value={`${accuracyPct}%`} color="emerald" />
        <KPI icon={Clock} label="Avg time" value={`${avgTime}s`} color="indigo" />
        <KPI icon={Zap} label="Fastest" value={fastest} color="amber" />
        <KPI icon={BarChart3} label="Questions" value={t.questionsSolved} color="blue" />
      </div>

      {data.daily.length > 0 && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-4">Last 14 days activity</h2>
          <div className="flex items-end gap-1.5 h-32">
            {data.daily.slice(0, 14).reverse().map((d: any, i: number) => {
              const max = Math.max(...data.daily.slice(0, 14).map((x: any) => x.questionsSolved), 1);
              const h = Math.max(8, (d.questionsSolved / max) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${d.date}: ${d.questionsSolved} questions`}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: i * 0.02 }}
                    className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-md min-h-[8px]"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-navy-500">
            <span>{data.daily[Math.min(13, data.daily.length - 1)]?.date}</span>
            <span>{data.daily[0]?.date}</span>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-slate-900 dark:text-navy-50">All categories</h2>
        </div>
        {cats.length === 0 ? (
          <EmptyState title="No category data yet" description="Complete practice sessions to build your profile." />
        ) : (
          <div className="space-y-3">
            {cats.map((c: any) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-700 dark:text-navy-200 font-medium">{c.name}</span>
                  <span className="text-slate-500 dark:text-navy-400 tabular-nums">
                    {Math.round(c.accuracy * 100)}% · {(c.averageResponseTime / 1000).toFixed(1)}s avg · {c.questionsAttempted} questions
                  </span>
                </div>
                <ProgressBar
                  value={c.accuracy * 100}
                  max={100}
                  color={c.accuracy >= 0.8 ? "emerald" : c.accuracy >= 0.6 ? "indigo" : "amber"}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-navy-50 mb-3">Strong areas</h3>
          {strong.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-navy-400">No strong categories yet. Keep practicing.</p>
          ) : (
            <ul className="space-y-2">
              {strong.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-navy-200">{c.name}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{Math.round(c.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 dark:text-navy-50 mb-3">Needs work</h3>
          {weak.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-navy-400">No weak categories detected. Excellent.</p>
          ) : (
            <ul className="space-y-2">
              {weak.map((c: any) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-navy-200">{c.name}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{Math.round(c.accuracy * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: "emerald" | "indigo" | "amber" | "blue" }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  };
  const colorClass = map[color] ?? "bg-slate-50 dark:bg-navy-800 text-slate-600 dark:text-navy-300";
  return (
    <Card className="p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-navy-400 font-medium mt-3">{label}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-navy-50 mt-1">{value}</div>
    </Card>
  );
}
