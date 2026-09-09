import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { useTheme } from "@/store/theme.store";
import { Layout } from "@/components/Layout";
import { LandingPage } from "@/pages/LandingPage";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PracticePage } from "@/pages/PracticePage";
import { QuizPage } from "@/pages/QuizPage";
import { ResultsPage } from "@/pages/ResultsPage";
import { PatternsPage } from "@/pages/PatternsPage";
import { PerformancePage } from "@/pages/PerformancePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-navy-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { init: initAuth } = useAuth();
  const { init: initTheme } = useTheme();

  useEffect(() => {
    initAuth();
    initTheme();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><AuthPage mode="register" /></PublicOnly>} />

      <Route path="/dashboard" element={<Protected><AppLayout><DashboardPage /></AppLayout></Protected>} />
      <Route path="/" element={<Protected><AppLayout><DashboardPage /></AppLayout></Protected>} />
      <Route path="/practice" element={<Protected><AppLayout><PracticePage /></AppLayout></Protected>} />
      <Route path="/quiz/:sessionId" element={<Protected><AppLayout><QuizPage /></AppLayout></Protected>} />
      <Route path="/results/:sessionId" element={<Protected><AppLayout><ResultsPage /></AppLayout></Protected>} />
      <Route path="/patterns" element={<Protected><AppLayout><PatternsPage /></AppLayout></Protected>} />
      <Route path="/performance" element={<Protected><AppLayout><PerformancePage /></AppLayout></Protected>} />
      <Route path="/history" element={<Protected><AppLayout><HistoryPage /></AppLayout></Protected>} />
      <Route path="/settings" element={<Protected><AppLayout><SettingsPage /></AppLayout></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
