import { useEffect, useState } from "react";
import { Search, BookOpen, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Card, Spinner, EmptyState, Badge } from "@/components/ui";
import clsx from "clsx";

export function PatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.patterns().then(setPatterns).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const filtered = patterns.filter((p) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return (
      p.title.toLowerCase().includes(s) ||
      p.description.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s) ||
      (p.formula || "").toLowerCase().includes(s) ||
      p.examples.some((ex: string) => ex.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-navy-50">Mental Math Patterns</h1>
        <p className="text-slate-500 dark:text-navy-400 mt-1">A searchable library of every shortcut you need.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search patterns, formulas, examples..."
          className="input pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No patterns found" description="Try a different search term." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="p-6 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-navy-50">{p.title}</h3>
                  <Badge variant="primary" className="mt-1.5">{p.category}</Badge>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-navy-300 leading-relaxed mb-4">{p.description}</p>
              {p.formula && (
                <div className="mb-3 p-2.5 rounded-lg bg-slate-50 dark:bg-navy-800/50 font-mono text-xs text-slate-700 dark:text-navy-200">
                  {p.formula}
                </div>
              )}
              <div className="space-y-1.5">
                {p.examples.slice(0, 4).map((ex: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-navy-300">
                    <span className="text-slate-400 dark:text-navy-500 mt-0.5">•</span>
                    <span className="flex-1">{ex}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
