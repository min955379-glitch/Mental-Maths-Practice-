import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, ChevronRight, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Spinner, EmptyState, Badge } from "@/components/ui";

export function HistoryPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.history().then(setSessions).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-navy-50">Session history</h1>
        <p className="text-slate-500 dark:text-navy-400 mt-1">All your past practice sessions.</p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="No sessions yet" description="Start your first practice to build history." />
      ) : (
        <Card className="divide-y divide-slate-100 dark:divide-navy-800">
          {sessions.map((s) => (
            <Link
              key={s.id}
              to={`/results/${s.id}`}
              className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-navy-800/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 dark:text-navy-50 capitalize">{s.mode} practice</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-navy-400 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {s.completedAt ? new Date(s.completedAt).toLocaleString() : "—"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-slate-900 dark:text-navy-50">{s.score}%</div>
                  <div className="text-xs text-slate-500 dark:text-navy-400">
                    {s.correctAnswers}/{s.totalQuestions}
                  </div>
                </div>
                <Badge variant="primary" className="hidden sm:inline-flex capitalize">{s.mode}</Badge>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
