import { Sun, Moon, Monitor, Volume2, VolumeX, Eye, Brain, Target, Mail, User, LogOut } from "lucide-react";
import { useTheme } from "@/store/theme.store";
import { useAuth } from "@/store/auth.store";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "@/components/ui";
import clsx from "clsx";

export function SettingsPage() {
  const { theme, set: setTheme, reducedMotion } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-navy-50">Settings</h1>
        <p className="text-slate-500 dark:text-navy-400 mt-1">Customize your training experience.</p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-1">Appearance</h2>
        <p className="text-sm text-slate-500 dark:text-navy-400 mb-4">Choose your preferred theme.</p>
        <div className="grid grid-cols-2 gap-3">
          <ThemeOption
            icon={Sun}
            label="Light"
            selected={theme === "light"}
            onClick={() => setTheme("light")}
          />
          <ThemeOption
            icon={Moon}
            label="Dark"
            selected={theme === "dark"}
            onClick={() => setTheme("dark")}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-1">Accessibility</h2>
        <p className="text-sm text-slate-500 dark:text-navy-400 mb-4">Settings for a comfortable experience.</p>
        <div className="space-y-3">
          <Toggle
            icon={Eye}
            label="Reduced motion"
            description="Minimize animations and transitions (also respects system setting)"
            checked={reducedMotion}
            disabled
          />
          <Toggle
            icon={Monitor}
            label="High contrast"
            description="Increase text contrast for better readability"
            checked={false}
            disabled
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-1">Practice</h2>
        <p className="text-sm text-slate-500 dark:text-navy-400 mb-4">Default settings for your sessions.</p>
        <div className="space-y-3">
          <Toggle
            icon={Target}
            label="Strict mode (no hints)"
            description="Hides hints during practice to mirror real test conditions"
            checked={true}
            disabled
          />
          <Toggle
            icon={Brain}
            label="Instant feedback"
            description="Show correct/incorrect after every question"
            checked={true}
            disabled
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900 dark:text-navy-50 mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-navy-800/50">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <User className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="font-medium text-slate-900 dark:text-navy-50">{user?.username}</div>
              <div className="text-xs text-slate-500 dark:text-navy-400">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="danger"
            onClick={() => { logout(); navigate("/login"); }}
            icon={<LogOut className="w-4 h-4" />}
          >
            Sign out
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ThemeOption({ icon: Icon, label, selected, onClick }: { icon: any; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "p-4 rounded-lg border-2 flex items-center gap-3 transition-all",
        selected
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
          : "border-slate-200 dark:border-navy-800 hover:border-slate-300 dark:hover:border-navy-700"
      )}
    >
      <Icon className={clsx("w-5 h-5", selected ? "text-indigo-600" : "text-slate-500 dark:text-navy-400")} />
      <span className={clsx("font-medium", selected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-700 dark:text-navy-200")}>
        {label}
      </span>
    </button>
  );
}

function Toggle({ icon: Icon, label, description, checked, disabled }: { icon: any; label: string; description: string; checked: boolean; disabled?: boolean }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-navy-800/40">
      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-navy-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-slate-600 dark:text-navy-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-900 dark:text-navy-50">{label}</div>
        <div className="text-xs text-slate-500 dark:text-navy-400 mt-0.5">{description}</div>
      </div>
      <div className={clsx(
        "w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0",
        checked ? "bg-indigo-500" : "bg-slate-300 dark:bg-navy-700",
        disabled && "opacity-60"
      )}>
        <div className={clsx(
          "w-5 h-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-4"
        )} />
      </div>
    </div>
  );
}
