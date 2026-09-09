import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  reducedMotion: boolean;
  toggle: () => void;
  set: (t: Theme) => void;
  init: () => void;
}

const KEY = "mm_theme";

export const useTheme = create<ThemeState>((set, get) => ({
  theme: "light",
  reducedMotion: false,
  toggle: () => {
    const next = get().theme === "light" ? "dark" : "light";
    localStorage.setItem(KEY, next);
    applyTheme(next);
    set({ theme: next });
  },
  set: (t) => {
    localStorage.setItem(KEY, t);
    applyTheme(t);
    set({ theme: t });
  },
  init: () => {
    const saved = (localStorage.getItem(KEY) as Theme | null);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const t: Theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(t);
    set({ theme: t, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  },
}));

function applyTheme(t: Theme) {
  if (t === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}
