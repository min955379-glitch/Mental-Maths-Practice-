import { ReactNode, ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const variantClass = {
    primary: "bg-navy-900 dark:bg-indigo-600 text-white hover:bg-navy-800 dark:hover:bg-indigo-500",
    secondary: "bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-navy-50 hover:bg-slate-200 dark:hover:bg-navy-700",
    ghost: "text-slate-700 dark:text-navy-200 hover:bg-slate-100 dark:hover:bg-navy-800",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[variant];

  const sizeClass = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  }[size];

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variantClass,
        sizeClass,
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function Card({ children, className, elevated }: { children: ReactNode; className?: string; elevated?: boolean }) {
  return (
    <div className={clsx(elevated ? "card-elevated" : "card", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, variant = "neutral", className }: { children: ReactNode; variant?: "primary" | "success" | "danger" | "neutral"; className?: string }) {
  const v = {
    primary: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
    success: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    danger: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    neutral: "bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-navy-200",
  }[variant];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium", v, className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, max, color = "indigo" }: { value: number; max: number; color?: "indigo" | "emerald" | "amber" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const colorClass = {
    indigo: "bg-indigo-600",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
  }[color];
  return (
    <div className="h-1.5 w-full bg-slate-200 dark:bg-navy-800 rounded-full overflow-hidden">
      <div
        className={clsx("h-full transition-all duration-500 ease-out rounded-full", colorClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-navy-400">{label}</span>
      <span className="text-2xl font-bold text-slate-900 dark:text-navy-50 mt-1">{value}</span>
      {sub && <span className="text-xs text-slate-500 dark:text-navy-400 mt-0.5">{sub}</span>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-navy-50">{title}</h3>
      {description && <p className="text-sm text-slate-500 dark:text-navy-400 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" }[size];
  return <Loader2 className={clsx(s, "animate-spin text-indigo-600")} />;
}
