import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Target, Clock, Trophy, TrendingUp, Brain, AlertTriangle, RotateCcw, Flame, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Stat, Badge, Button, EmptyState, Spinner } from "@/components/ui";
import { useAuth } from "@/store/auth.store";

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [coach, setCoach] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.dashboard(), api.coach()])
      .then(([d, c]) => { setData(d); setCoach(c); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!data) return <EmptyState title="Unable to load dashboard" />;

  const t = data.totals;
  const accuracyPct = Math.round(t.accuracy * 100);
  const avgTimeSec = (t.averageResponseTimeMs / 1000).toFixed(1);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-navy-50">
          {greeting}, {user?.username || "there"}
        </h1>
        <p className="text-slate-500 dark:text-navy-400 mt-1">Your mental math arena is ready.</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-navy-400 text-xs font-medium uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5" />
            Streak
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-navy-50 mt-2">{t.streak}<span className="text-base text-slate-400 dark:text-navy-500 font-normal ml-1">days</span></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-navy-400 text-xs font-medium uppercase tracking-wider">
            <Target className="w-3.5 h-3.5" />
            Accuracy
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-navy-50 mt-2">{accuracyPct}<span className="text-base text-slate-400 dark:text-navy-500 font-normal">%</span></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-navy-400 text-xs font-medium uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            Avg time
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-navy-50 mt-2">{avgTimeSec}<span className="text-base text-slate-400 dark:text-navy-500 font-normal ml-1">s</span></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-slate-500 dark:text-navy-400 text-xs font-medium uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" />
            Best score
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-navy-50 mt-2">{t.bestScore}<span className="text-base text-slate-400 dark:text-navy-500 font-normal">%</span></div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-navy-50">Practice modes</h2>
          <Badge variant={t.performanceLabel === "Elite" || t.performanceLabel === "Strong" ? "success" : "primary"}>
            {t.performanceLabel}
          </Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ModeCard to="/practice?mode=quick" icon={Zap} title="Quick Practice" body="10 questions, no pressure, instant feedback." />
          <ModeCard to="/practice?mode=timed" icon={Clock} title="Timed Quiz" body="20 questions with a 10-minute timer." />
          <ModeCard to="/practice?mode=full" icon={Trophy} title="Full Test" body="50 questions, exam-style experience." />
          <ModeCard to="/practice?mode=category" icon={Target} title="Category Practice" body="Focus on a specific topic." />
          <ModeCard to="/practice?mode=weak" icon={AlertTriangle} title="Weak Areas" body="Target your lowest-accuracy categories." />
          <ModeCard to="/practice?mode=mistake" icon={RotateCcw} title="Mistake Review" body="Re-attempt questions you got wrong." />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-navy-50">Performance by category</h2>
            <Link to="/performance" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data.categories.length === 0 ? (
            <EmptyState title="No data yet" description="Complete a practice session to see your category breakdown." />
          ) : (
            <div className="space-y-3">
              {data.categories.slice(0, 6).map((c: any) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-slate-700 dark:text-navy-200 font-medium">{c.name}</span>
                    <span className="text-slate-500 dark:text-navy-400 tabular-nums">{Math.round(c.accuracy * 100)}% · {(c.averageResponseTime / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                    <motion.div
                      className={c.accuracy >= 0.8 ? "bg-emerald-500" : c.accuracy >= 0.6 ? "bg-indigo-500" : "bg-amber-500"}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(c.accuracy * 100)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 dark:text-navy-50">AI Coach</h2>
          </div>
          {coach && (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 dark:text-navy-200">{coach.summary}</p>
              {coach.tips.length > 0 && (
                <ul className="space-y-2">
                  {coach.tips.slice(0, 3).map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-navy-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              )}
              {coach.weak.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-navy-800">
                  <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-navy-400 font-medium mb-2">Recommended focus</div>
                  <div className="flex flex-wrap gap-2">
                    {coach.weak.map((w: string) => (
                      <Link key={w} to={`/practice?mode=category&category=${encodeURIComponent(w)}`}>
                        <Badge variant="danger">{w}</Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-4">Recent activity</h2>
        {data.recentSessions.length === 0 ? (
          <EmptyState title="No sessions yet" description="Start your first practice to track progress." action={<Link to="/practice"><Button>Start Practice</Button></Link>} />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-navy-800">
            {data.recentSessions.map((s: any) => (
              <Link key={s.id} to={`/results/${s.id}`} className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-navy-800/50 -mx-2 px-2 rounded-lg transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-navy-50 capitalize">{s.mode} · {s.correct + s.incorrect} questions</div>
                    <div className="text-xs text-slate-500 dark:text-navy-400">{s.completedAt ? new Date(s.completedAt).toLocaleString() : ""}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900 dark:text-navy-50">{s.score}%</div>
                  <div className="text-xs text-slate-500 dark:text-navy-400">{(s.averageTimeMs / 1000).toFixed(1)}s avg</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ModeCard({ to, icon: Icon, title, body }: { to: string; icon: any; title: string; body: string }) {
  return (
    <Link
      to={to}
      className="group p-4 rounded-xl border border-slate-200 dark:border-navy-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-navy-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 flex items-center justify-center transition-colors">
          <Icon className="w-4.5 h-4.5 text-slate-600 dark:text-navy-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-navy-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-navy-50 mt-3">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">{body}</p>
    </Link>
  );
}
