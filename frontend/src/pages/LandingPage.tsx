import { Link } from "react-router-dom";
import { Brain, Zap, Target, BarChart3, BookOpen, Timer, Lightbulb, Trophy, ArrowRight, Sparkles } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      <header className="border-b border-slate-200 dark:border-navy-800 bg-white/80 dark:bg-navy-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-navy-900 dark:bg-indigo-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-navy-50 leading-tight">Mental Math Arena</div>
              <div className="text-[10px] font-normal text-slate-500 dark:text-navy-400 uppercase tracking-widest">ISCSP Preparation</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              ISCSP Mental Math AI Arena
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 dark:text-navy-50 leading-tight tracking-tight">
              Train your mental speed.<br />
              <span className="text-indigo-600 dark:text-indigo-400">Master the patterns.</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-navy-300 mt-6 max-w-2xl mx-auto">
              The most focused mental-math training platform for ISCSP preparation. Instant feedback, mental shortcuts, speed tracking, and adaptive practice.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <Link to="/register" className="btn-primary size-lg">
                Start Practice
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/login" className="btn-secondary size-lg">Sign in</Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon={Zap} title="Instant Feedback" body="See whether you got it right and learn the fastest mental shortcut for every question — right after you answer." />
            <FeatureCard icon={Target} title="Adaptive Practice" body="The system identifies your weak categories and builds focused practice sessions automatically." />
            <FeatureCard icon={Timer} title="Speed Tracking" body="Measure response time on every question. Train to solve faster with mental math patterns." />
            <FeatureCard icon={BookOpen} title="Mental Patterns Library" body="Searchable reference of all the shortcuts: 10% rule, 12.5% = 1/8, man-days, product-over-sum, and more." />
            <FeatureCard icon={BarChart3} title="Performance Insights" body="Track accuracy, average time, and category breakdown. See real improvement over time." />
            <FeatureCard icon={Lightbulb} title="AI Coach" body="Data-driven advice based on your actual performance, not generic motivation." />
          </div>
        </section>

        <section className="bg-white dark:bg-navy-900 border-y border-slate-200 dark:border-navy-800 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <Trophy className="w-10 h-10 text-indigo-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-900 dark:text-navy-50">Built for serious exam preparation</h2>
            <p className="text-slate-600 dark:text-navy-300 mt-3 max-w-2xl mx-auto">
              No multiple-choice crutches. No calculator. Every question is answered from memory. Patterns are reinforced through repetition. That is how you build real mental speed.
            </p>
            <Link to="/register" className="btn-primary size-lg mt-8 inline-flex">
              Create your account
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 dark:border-navy-800 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-500 dark:text-navy-400">
          ISCSP Mental Math AI Arena — Production-grade training platform
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="font-semibold text-slate-900 dark:text-navy-50">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-navy-300 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}
