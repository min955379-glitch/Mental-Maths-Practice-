import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Brain, ArrowRight, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import { Button, Card } from "@/components/ui";

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { login, register, user, loading, error } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login(emailOrUsername, password);
      } else {
        await register(email, username, password);
      }
      navigate("/");
    } catch {
      // error in store
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-navy-950 p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-lg bg-navy-900 dark:bg-indigo-600 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-xl text-slate-900 dark:text-navy-50">Mental Math Arena</div>
            <div className="text-[10px] font-normal text-slate-500 dark:text-navy-400 uppercase tracking-widest">ISCSP Preparation</div>
          </div>
        </Link>

        <Card elevated className="p-7">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-navy-50">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-navy-400 mt-1">
            {mode === "login" ? "Sign in to continue your training" : "Start your mental math training journey"}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "login" ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-navy-200 mb-1.5">Email or username</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-navy-200 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-navy-200 mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      autoComplete="username"
                      required
                      minLength={3}
                      pattern="[a-zA-Z0-9_]+"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input pl-10"
                      placeholder="yourhandle"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-navy-200 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              {mode === "login" ? "Sign in" : "Create account"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-navy-400">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign up</Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Sign in</Link>
              </>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 dark:text-navy-500 mt-6">
          By continuing, you agree to train your mental math skills.
        </p>
      </div>
    </div>
  );
}
