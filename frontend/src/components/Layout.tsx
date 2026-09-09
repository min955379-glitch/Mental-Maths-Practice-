import { Link, NavLink, useNavigate } from "react-router-dom";
import { Brain, LayoutDashboard, BookOpen, Settings as SettingsIcon, LogOut, BarChart3, History, Menu, X, Sun, Moon } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/store/auth.store";
import { useTheme } from "@/store/theme.store";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/practice", icon: Brain, label: "Practice" },
    { to: "/patterns", icon: BookOpen, label: "Patterns" },
    { to: "/performance", icon: BarChart3, label: "Performance" },
    { to: "/history", icon: History, label: "History" },
    { to: "/settings", icon: SettingsIcon, label: "Settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-navy-950">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-navy-950/80 border-b border-slate-200 dark:border-navy-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-slate-900 dark:text-navy-50">
            <div className="w-9 h-9 rounded-lg bg-navy-900 dark:bg-indigo-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="leading-tight">Mental Math Arena</div>
              <div className="text-[10px] font-normal text-slate-500 dark:text-navy-400 uppercase tracking-widest">ISCSP Preparation</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-navy-50"
                      : "text-slate-600 dark:text-navy-300 hover:bg-slate-100 dark:hover:bg-navy-800"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-600 dark:text-navy-300"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="hidden md:flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-600 dark:text-navy-300"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-600 dark:text-navy-300"
              aria-label="Menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950">
            <div className="px-4 py-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                      isActive
                        ? "bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-navy-50"
                        : "text-slate-600 dark:text-navy-300"
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
              <button
                onClick={() => { logout(); navigate("/login"); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-navy-800 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-500 dark:text-navy-400">
          ISCSP Mental Math AI Arena — Train your mental speed. Master the patterns.
        </div>
      </footer>
    </div>
  );
}
