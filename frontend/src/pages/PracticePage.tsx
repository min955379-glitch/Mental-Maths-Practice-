import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Clock, Trophy, Target, AlertTriangle, RotateCcw, ArrowRight, Check } from "lucide-react";
import { Card, Button, Spinner, Badge } from "@/components/ui";
import { api } from "@/lib/api";
import clsx from "clsx";

const MODES = [
  { key: "quick", icon: Zap, title: "Quick Practice", body: "10 questions. No pressure. Instant feedback.", color: "indigo" },
  { key: "timed", icon: Clock, title: "Timed Quiz", body: "20 questions with a 10-minute countdown timer.", color: "amber" },
  { key: "full", icon: Trophy, title: "Full Test", body: "50 questions. Exam-style. Results at the end.", color: "emerald" },
  { key: "category", icon: Target, title: "Category Practice", body: "Focus on one topic for 15 questions.", color: "blue", needsCategory: true },
  { key: "weak", icon: AlertTriangle, title: "Weak Areas", body: "Automatically targets your lowest-accuracy categories.", color: "red" },
  { key: "mistake", icon: RotateCcw, title: "Mistake Review", body: "Re-attempt questions you previously got wrong.", color: "purple" },
];

export function PracticePage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState<string>(params.get("mode") || "");
  const [categorySlug, setCategorySlug] = useState<string>(params.get("category") || "");
  const [timerEnabled, setTimerEnabled] = useState(true);

  useEffect(() => {
    api.categories().then(setCategories).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const m = params.get("mode");
    if (m) setMode(m);
    const c = params.get("category");
    if (c) setCategorySlug(c);
  }, [params]);

  const start = async () => {
    if (!mode) return;
    if (mode === "category" && !categorySlug) return;
    setStarting(true);
    try {
      const { sessionId } = await api.startQuiz({
        mode,
        categorySlug: mode === "category" ? categorySlug : undefined,
        timerSeconds: mode === "timed" ? 600 : undefined,
      });
      navigate(`/quiz/${sessionId}`);
    } catch (e: any) {
      alert(e.message || "Failed to start session");
      setStarting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const selectedMode = MODES.find((m) => m.key === mode);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-navy-50">Choose your practice mode</h1>
        <p className="text-slate-500 dark:text-navy-400 mt-1">Select a mode to start training. You can stop anytime.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODES.map((m) => {
          const Icon = m.icon;
          const selected = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => {
                setMode(m.key);
                const np = new URLSearchParams(params);
                np.set("mode", m.key);
                if (m.key !== "category") np.delete("category");
                setParams(np);
              }}
              className={clsx(
                "text-left p-5 rounded-xl border-2 transition-all relative",
                selected
                  ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-900/20"
                  : "border-slate-200 dark:border-navy-800 hover:border-slate-300 dark:hover:border-navy-700"
              )}
            >
              {selected && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-3">
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selected ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-navy-300"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-navy-50">{m.title}</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-navy-300">{m.body}</p>
            </button>
          );
        })}
      </div>

      {mode === "category" && (
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-1">Select a category</h2>
          <p className="text-sm text-slate-500 dark:text-navy-400 mb-4">Pick the topic you want to focus on.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategorySlug(c.slug)}
                className={clsx(
                  "p-3 rounded-lg border text-left text-sm font-medium transition-all",
                  categorySlug === c.slug
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-navy-800 text-slate-700 dark:text-navy-200 hover:border-slate-300 dark:hover:border-navy-700"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Card>
      )}

      {mode === "timed" && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-navy-50">Timer setting</h2>
              <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">10 minutes for 20 questions.</p>
            </div>
            <Badge variant="primary">10:00</Badge>
          </div>
        </Card>
      )}

      <div className="sticky bottom-4 z-10">
        <Card elevated className="p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-navy-400">Selected</div>
            <div className="font-semibold text-slate-900 dark:text-navy-50">
              {selectedMode ? selectedMode.title : "Choose a mode to continue"}
            </div>
          </div>
          <Button
            size="lg"
            onClick={start}
            disabled={!mode || (mode === "category" && !categorySlug) || starting}
            loading={starting}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Start
          </Button>
        </Card>
      </div>
    </div>
  );
}
